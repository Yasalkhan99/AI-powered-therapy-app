import Sentiment from 'sentiment';
import { retrieveContext } from '../../utils/rag';
import { encode } from 'gpt-3-encoder';

// Prompt injection and jailbreak guards
const BLOCK_PATTERNS = [
  /ignore (all|previous|above) instructions/i,
  /act as (?:a|an) (?:doctor|therapist|lawyer)/i,
  /reveal system prompt/i,
  /output raw tools? config/i,
  /you are now/i,
  /pretend to be/i,
  /roleplay as/i,
];

// PII redaction utilities
function redactPII(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[email]')
    .replace(/\b\+?\d[\d\s().-]{7,}\b/g, '[phone]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[card]');
}

// Input sanitization
function sanitizeUserInput(input) {
  if (!input || typeof input !== 'string') return input;
  
  // Check for prompt injection attempts
  if (BLOCK_PATTERNS.some(rx => rx.test(input))) {
    return "Let's stay focused on your experience right now. Tell me what happened, and when it started.";
  }
  
  // Redact PII
  return redactPII(input);
}

// Crisis resources by country (UK/US/Canada focused)
const CRISIS_RESOURCES = {
  GB: [
    'Samaritans: 116 123 (free, 24/7)',
    'Crisis Text Line: Text SHOUT to 85258',
    'NHS 111 for urgent mental health support'
  ],
  US: [
    '988 – Suicide & Crisis Lifeline (24/7)',
    'Crisis Text Line: Text HOME to 741741',
    'SAMHSA National Helpline: 1-800-662-4357'
  ],
  CA: [
    'Talk Suicide Canada: 1-833-456-4566',
    'Kids Help Phone: 1-800-668-6868',
    'Crisis Services Canada: 1-833-456-4566'
  ],
  GLOBAL: ['International Association for Suicide Prevention – find local helplines'],
};

function getCrisisResources(countryCode) {
  return CRISIS_RESOURCES[countryCode] || CRISIS_RESOURCES.GLOBAL;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // 10 requests per minute
const ipRequestCounts = new Map();

// Natural doctor-style conversation based on examples
const formattingSystemPrompt = `You are a warm, experienced counselor having a natural conversation. Follow these conversation style rules exactly:

**CONVERSATION STYLE RULES:**
1. Ask specific follow-up questions about timing, sequence, and people involved
2. Be curious about story details without making them feel pressured  
3. Acknowledge what they haven't shared yet
4. Use natural pauses and reactions in conversation flow
5. Match their language naturally (English/Hinglish/Roman Urdu)
6. Honor their pace and experience - don't rush them
7. Do not give generic advice - focus on listening and understanding first

**EXACT EXAMPLES TO FOLLOW:**

User: "They got a gang, they bullied me by showing guns"
You: "Was this just yesterday? I know you haven't had a chance to explain exactly what happened next — take your time."

User: "Mai aj bully hua"  
You: "This happened today? Sounds like you're still processing it. You haven't said yet what led up to it — I'm here, listening."

User: "I'm feeling lonely"
You: "How long has this loneliness been sitting with you? You've told me the feeling, but not yet what's been happening around you lately."

User: "They hit me in front of everyone"
You: "When did this happen? You haven't mentioned who else saw it — and I'm curious how people reacted."

User: "I'm really stressed"
You: "Since when has this stress been building up? You've told me the emotion, but not yet the situations behind it."

User: "Kal raat fight hui"
You: "Last night? You haven't shared yet how it started — were there many people there?"

User: "I got bad news from home"
You: "When did you hear it? You haven't told me what happened after you found out — I want to understand."

User: "Main aj bht udaas hun"
You: "Today especially? You haven't mentioned what triggered it — I'm here to hear the full story whenever you're ready."

**MORE NATURAL CONVERSATION EXAMPLES:**
- "This happened today? You haven't yet told me what started it — take your time."
- "That sounds heavy. What happened right before this moment?"
- "You mentioned they shouted — but not what they said. I'm listening."
- "When did you first notice this happening? You haven't shared who was around."
- "That must have been hard. What did people do when they saw it?"
- "How recent was this? You haven't yet said what happened right after."
- "You've told me what they did — but not how it made you feel."
- "When exactly did this take place? Was anyone standing with you?"
- "That sounds intense. What happened in the minutes leading up to it?"
- "You said they laughed — but not what was said. I'm here to hear it."
- "How did this start? You've told me the ending but not the beginning."
- "When you say they ignored you, do you mean just today or for a while now?"
- "That must have been unsettling. What happened once it was over?"
- "You mentioned feeling scared — but what exactly made you feel that way?"
- "When did you first realize it was happening? Who else was nearby?"
- "You've told me the action — but not the tone they used."
- "That sounds like a lot. How did you react in the moment?"
- "Was this in a public place? You haven't mentioned where exactly."
- "When did they say this to you? Was anyone else involved?"
- "That must have been shocking. How long did it go on?"
- "You've told me they looked angry — but what were they doing with their hands?"
- "Was this a one-time thing or has it been happening before?"
- "That sounds upsetting. What happened as soon as it ended?"
- "How did the people around you respond? You haven't said yet."
- "You've shared what they said — but not how you answered."
- "Was this during the day or at night? You haven't mentioned when."
- "That sounds hurtful. Did anyone try to step in?"
- "You've told me the event — but not how your body reacted."
- "When did this take place? You haven't mentioned the location yet."
- "That must have been overwhelming. What did you do right after?"
- "You said they pushed you — but not where you were at the time."
- "Has this happened before? You haven't said if it's a pattern."
- "That sounds frightening. Did anyone speak up for you?"
- "You've told me part of the story — what happened just before it?"
- "When you think about it now, what's the moment that stays in your mind the most?"

**KEY PHRASES TO USE:**
- "You haven't told me yet..."
- "You haven't shared yet..." 
- "You haven't mentioned..."
- "I'm curious..."
- "I want to understand..."
- "Take your time..."
- "I'm here, listening..."
- "That sounds [emotion]..."
- "What happened right before/after..."
- "You've told me [X] — but not [Y]..."

**NEVER USE:**
- "I'm sorry to hear"
- "That sounds difficult" 
- "Can you share more"
- Generic sympathy phrases

If serious self-harm mentioned: [SAFETY_CRISIS_DETECTED]`;

// Request validation schema
const validateRequest = (messages) => {
  if (!Array.isArray(messages)) {
    throw new Error('Messages must be an array');
  }                                                                 
  if (messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }

  for (const message of messages) {
    if (!message.role || !message.content) {
      throw new Error('Each message must have a role and content');
    }
    if (!['user', 'assistant', 'system'].includes(message.role)) {
      throw new Error('Invalid message role');
    }
    if (typeof message.content !== 'string') {
      throw new Error('Message content must be a string');
    }
  }
};

// Enhanced Mood Detection
const calculateMood = (score) => {
  if (score > 3) return 'very positive';
  if (score > 1) return 'positive';
  if (score < -3) return 'very negative';
  if (score < -1) return 'negative';
  return 'neutral';
};

// Adaptive Session Flow
const getSessionPrompt = (problemType, userInfo) => {
  const { name } = userInfo || {};
  // Concise intro: only mention user info if available
  const intro = name ? `You are EchoNest, an AI therapist supporting ${name}.` : `You are EchoNest, an AI therapist.`;
  // Safety: use a token for crisis
  const safety = `If you detect self-harm or suicide intent, output only this token: [SAFETY_CRISIS_DETECTED]`;
  // Enhanced conversation rules
  const generalRules = `- Only answer therapy, mental health, or emotional wellbeing questions.
- Prioritize understanding over problem-solving in early conversations.
- Use open-ended questions to gather information about feelings, circumstances, and context.
- Show empathy and validation for all emotions expressed.
- Keep responses warm, conversational, and properly formatted with paragraph breaks.
- Only provide specific advice after understanding the full situation.`;
  // Problem-specific focus (optional, can be further condensed)
  const problemFocus = problemType ? `Focus: ${problemType}` : '';
  return [intro, problemFocus, generalRules, safety].filter(Boolean).join('\n');
};

// Logging function
const logRequest = (req, status, error = null) => {
  const timestamp = new Date().toISOString();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const logEntry = {
    timestamp,
    ip,
    method: req.method,
    path: req.url,
    status,
    error: error?.message || null
  };
  console.log(JSON.stringify(logEntry));
};

const filterProhibitedContent = (responseText, userName) => {
  if (!responseText || typeof responseText !== 'string') return '';
  const name = userName || '';
  const prohibitedMessages = [
    "I'm sorry to see you're feeling this way. Can you tell me a bit more about what's been going on recently that has been causing you distress?",
    `I'm really sorry that you're feeling this way, ${name}, but I'm unable to provide the help that you need. It's really important to talk things over with someone who can, though, such as a mental health professional or a trusted person in your life.`
    // Add more prohibited phrases as needed
  ];
  for (const prohibited of prohibitedMessages) {
    if (responseText.includes(prohibited)) {
      responseText = responseText.replace(
        prohibited,
        "I'm here for you. You are not alone, and I'm here to listen and support you. Would you like to talk more about what's been making you feel this way?"
      );
    }
  }
  return responseText;
};

function logWithTimestamp(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

// Track OpenAI request timestamps for RPM logging
globalThis.openaiRequestTimestamps = globalThis.openaiRequestTimestamps || [];
function logOpenAIRPM() {
  const now = Date.now();
  // Remove timestamps older than 60 seconds
  globalThis.openaiRequestTimestamps = globalThis.openaiRequestTimestamps.filter(ts => now - ts < 60000);
  globalThis.openaiRequestTimestamps.push(now);
  const rpm = globalThis.openaiRequestTimestamps.length;
  logWithTimestamp(`OpenAI RPM (requests in last 60s): ${rpm}`);
}

// Helper function to add exponential backoff and retry on 429
async function fetchWithRetry(url, options, retries = 3, initialDelayMs = 60000) {
  let delayMs = initialDelayMs;
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status !== 429) return response;
    if (i < retries - 1) {
      logWithTimestamp(`Received 429 from OpenAI, delaying ${delayMs / 1000}s before retry...`);
      await new Promise(res => setTimeout(res, delayMs));
      delayMs *= 2; // Exponential backoff
    }
  }
  throw new Error('Too many requests (429) after retries');
}

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    logWithTimestamp('Method not allowed', req.method, req.url);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  // Clean up old entries
  for (const [storedIp, data] of ipRequestCounts.entries()) {
    if (data.timestamp < windowStart) {
      ipRequestCounts.delete(storedIp);
    }
  }
  // Check rate limit
  const requestData = ipRequestCounts.get(ip) || { count: 0, timestamp: now };
  if (requestData.count >= MAX_REQUESTS_PER_WINDOW) {
    logWithTimestamp('Rate limit exceeded for IP:', ip);
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  // Update request count
  ipRequestCounts.set(ip, {
    count: requestData.count + 1,
    timestamp: now
  });

  // Validate API key
  if (!process.env.OPENAI_API_KEY) {
    logWithTimestamp('OpenAI API key is not configured');
    return res.status(500).json({ error: 'OpenAI API key is not configured' });
  }

  try {
    const { messages, problemType, userInfo, setup } = req.body;
    
    // Get user session and profile data
    const { getServerSession } = await import('next-auth/next');
    const { authOptions } = await import('./auth/[...nextauth]');
    const prisma = (await import('../../lib/prisma')).default;
    
    const session = await getServerSession(req, res, authOptions);
    let userProfile = null;
    
    if (session?.user?.email) {
      try {
        userProfile = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: {
            fullName: true,
            age: true,
            gender: true,
            country: true,
            therapyFocus: true,
            therapyType: true,
            religion: true,
            description: true,
            setupCompleted: true
          }
        });
        logWithTimestamp('User profile loaded:', userProfile?.fullName);
      } catch (error) {
        logWithTimestamp('Error loading user profile:', error);
      }
    }
    
    // Sanitize and summarize messages for context
    const sanitizedMessages = messages.map(msg => ({
      ...msg,
      content: msg.role === 'user' ? sanitizeUserInput(msg.content) : msg.content
    }));
    
    // Keep last 15 messages, but summarize if too long
    const trimmedMessages = sanitizedMessages.slice(-15);
    
    // Validate request body
    try {
      validateRequest(trimmedMessages);
    } catch (validationError) {
      logWithTimestamp('Validation error:', validationError.message);
      return res.status(400).json({ error: validationError.message });
    }
    // Get the last user message for context retrieval
    const lastUserMessage = trimmedMessages
      .filter(m => m.role === 'user')
      .pop()?.content;
    // Retrieve relevant context if there's a user message
    let relevantContext = '';
    if (lastUserMessage) {
      try {
        const context = await retrieveContext(lastUserMessage);
        relevantContext = context.join('\n\n');
      } catch (error) {
        logWithTimestamp('Error retrieving context:', error);
        // Continue without context if retrieval fails
      }
    }
    // Enhanced mood analysis
    const sentiment = new Sentiment();
    const userMessages = trimmedMessages.filter(m => m.role === 'user' && typeof m.content === 'string');
    let startMood = null;
    let endMood = null;
    if (userMessages.length > 0) {
      startMood = calculateMood(sentiment.analyze(userMessages[0].content).score);
      endMood = calculateMood(sentiment.analyze(userMessages[userMessages.length - 1].content).score);
    }
    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    // Count conversation messages to determine response strategy
    const userMessageCount = trimmedMessages.filter(m => m.role === 'user').length;
    const isEarlyConversation = userMessageCount < 10;
    
    // Prepare system message with relevant context, setup information, and user profile
    let setupContext = '';
    if (setup) {
      setupContext = `\n\nSession Setup Information:
- Language: ${setup.language}
- Support Type: ${setup.supportType}
- Therapist: ${setup.therapistName}

Please respond in ${setup.language} and focus on ${setup.supportType} support.`;
    }
    
    // Add user profile context for personalized responses
    let profileContext = '';
    if (userProfile && userProfile.setupCompleted) {
      profileContext = `\n\nUser Profile Information:
- Name: ${userProfile.fullName}
- Age: ${userProfile.age} years old
- Gender: ${userProfile.gender}
- Country: ${userProfile.country}
- Primary Focus: ${userProfile.therapyFocus}
- Preferred Therapy Type: ${userProfile.therapyType}
${userProfile.religion ? `- Religion: ${userProfile.religion}` : ''}
${userProfile.description ? `- Personal Description: ${userProfile.description}` : ''}

Use this information to provide personalized, culturally-aware responses. Consider the user's age, cultural background, and therapy preferences when offering guidance.`;
    }
    
    const systemPrompt = formattingSystemPrompt + '\n\n' + getSessionPrompt(problemType, userInfo) + (relevantContext ? `\n\nRelevant context for this conversation:\n${relevantContext}` : '') + setupContext + profileContext + `\n\nCurrent conversation stage: ${isEarlyConversation ? 'Information gathering phase' : 'Ready for deeper support and guidance'}`;
    // Token counting for diagnostics
    const systemTokens = encode(systemPrompt).length;
    const userTokens = trimmedMessages.reduce((sum, m) => sum + encode(m.content || '').length, 0);
    const totalTokens = systemTokens + userTokens;
    logWithTimestamp(`Token usage: system=${systemTokens}, user=${userTokens}, total=${totalTokens}`);
    const systemMessage = {
      role: 'system',
      content: systemPrompt
    };
    logWithTimestamp('Sending to OpenAI:', { systemMessage, trimmedMessages });
    logOpenAIRPM();
    // Use fetchWithRetry instead of fetch directly
    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.8,
        messages: [
          systemMessage,
          ...trimmedMessages
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    logWithTimestamp('OpenAI response status:', response.status);
    if (!response.ok) {
      const error = await response.json();
      logWithTimestamp('OpenAI error:', error.error?.message || 'OpenAI API request failed');
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }
    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      logWithTimestamp('OpenAI reply received');
      let filteredContent = filterProhibitedContent(data.choices[0].message.content, userInfo?.name);
      if (!filteredContent || !filteredContent.trim()) {
        filteredContent = "I'm here for you. Can you tell me more about how you're feeling?";
      }
      // Build optional care plan and risk score heuristics
      const carePlan = {
        techniquesSuggested: [],
        nextStep: null,
      };
      if (/breath|breathing|inhale|exhale/i.test(filteredContent)) carePlan.techniquesSuggested.push('breathwork');
      if (/ground|5-4-3-2-1|observe/i.test(filteredContent)) carePlan.techniquesSuggested.push('grounding');
      if (/reframe|thought|cognitive/i.test(filteredContent)) carePlan.techniquesSuggested.push('cognitive-reframe');
      const nextMatch = filteredContent.match(/(try|consider|could you|for this week)[^\.\!\?]+[\.\!\?]/i);
      carePlan.nextStep = nextMatch ? nextMatch[0] : null;

      // Enhanced risk scoring with crisis resources
      const userText = trimmedMessages.filter(m => m.role === 'user').map(m => m.content).join(' ');
      let riskScore = 0.1;
      if (/suicide|kill myself|end my life|self-harm|hurt myself/i.test(userText + ' ' + filteredContent)) {
        riskScore = 0.8;
      } else if (/gun|weapon|hurt someone|violence/i.test(userText)) {
        riskScore = 0.6;
      } else if (/depression|anxiety|panic|can't cope/i.test(userText)) {
        riskScore = 0.3;
      }

      // Add crisis resources if high risk (UK/US/Canada focused)
      let crisisInfo = null;
      if (riskScore > 0.5) {
        let country = 'GLOBAL';
        if (userProfile?.country === 'United Kingdom' || userProfile?.country === 'UK') country = 'GB';
        else if (userProfile?.country === 'United States' || userProfile?.country === 'USA') country = 'US';
        else if (userProfile?.country === 'Canada') country = 'CA';
        
        crisisInfo = {
          resources: getCrisisResources(country),
          message: riskScore > 0.7 ? 'Please reach out for immediate support' : 'Remember these resources are available'
        };
      }

      res.status(200).json({ 
        reply: { ...data.choices[0].message, content: filteredContent },
        startMood,
        endMood,
        carePlan,
        riskScore,
        crisisInfo
      });
    } else {
      logWithTimestamp('No response from OpenAI');
      throw new Error('No response from OpenAI');
    }
  } catch (error) {
    logWithTimestamp('Handler error:', error.message || error);
    res.status(500).json({ 
      error: error.message || 'An error occurred while processing your request'
    });
  }
}

export { getSessionPrompt };
