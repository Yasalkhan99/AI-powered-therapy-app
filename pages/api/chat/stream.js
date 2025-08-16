import { getSessionPrompt } from '../chat';
import { retrieveContext, getTherapySimilarityScore } from '../../../utils/rag';
import Sentiment from 'sentiment';
import { encode } from 'gpt-3-encoder';

// Import safety utilities from chat.js
const BLOCK_PATTERNS = [
  /ignore (all|previous|above) instructions/i,
  /act as (?:a|an) (?:doctor|therapist|lawyer)/i,
  /reveal system prompt/i,
  /output raw tools? config/i,
  /you are now/i,
  /pretend to be/i,
  /roleplay as/i,
];

function sanitizeUserInput(input) {
  if (!input || typeof input !== 'string') return input;
  
  if (BLOCK_PATTERNS.some(rx => rx.test(input))) {
    return "Let's stay focused on your experience right now. Tell me what happened, and when it started.";
  }
  
  return input.replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[email]')
              .replace(/\b\+?\d[\d\s().-]{7,}\b/g, '[phone]');
}

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};

// In-memory per-IP rate limiter
const ipRequestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

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

function logWithTimestamp(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

export default async function handler(req, res) {
  logWithTimestamp('Handler started');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.flushHeaders();

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
    res.write('event: error\ndata: Too many requests. Please try again later.\n\n');
    res.end();
    return;
  }
  // Update request count
  ipRequestCounts.set(ip, {
    count: requestData.count + 1,
    timestamp: now
  });

  if (req.method === 'OPTIONS') {
    res.write('event: ready\ndata: ok\n\n');
    res.end();
    console.log('OPTIONS request, ended early');
    return;
  }
  if (req.method !== 'POST') {
    res.write('event: error\ndata: Method not allowed\n\n');
    res.end();
    console.log('Non-POST request, ended early');
    return;
  }

  try {
    logWithTimestamp('Received POST request');
    // Ensure API key is configured to avoid silent failures
    if (!process.env.OPENAI_API_KEY) {
      logWithTimestamp('OpenAI API key is not configured');
      res.write('event: error\ndata: OpenAI API key is not configured on the server.\n\n');
      res.end();
      return;
    }
    const { messages, problemType, userInfo, setup } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.write('event: error\ndata: Invalid messages\n\n');
      res.end();
      logWithTimestamp('Invalid messages, ended early');
      return;
    }
    // Sanitize messages and keep last 15 for context
    const sanitizedMessages = messages.map(msg => ({
      ...msg,
      content: msg.role === 'user' ? sanitizeUserInput(msg.content) : msg.content
    }));
    const trimmedMessages = sanitizedMessages.slice(-15);
    // Therapy-topic filtering and context retrieval in parallel
    const lastUserMessage = trimmedMessages.filter(m => m.role === 'user').pop()?.content;
    let isTherapyRelated = true;
    let relevantContext = '';
    let similarityScore = 1;
    if (lastUserMessage) {
      try {
        const [score, context] = await Promise.all([
          getTherapySimilarityScore(lastUserMessage),
          retrieveContext(lastUserMessage)
        ]);
        similarityScore = score;
        isTherapyRelated = similarityScore > 0.7;
        relevantContext = context.join('\n\n');
      } catch (err) {
        isTherapyRelated = true;
        relevantContext = '';
      }
    }
    if (!isTherapyRelated) {
      res.write('data: I can only assist with therapy-related questions. Could you please share how I can help with your emotional wellbeing today?\n\n');
      res.end();
      return;
    }
    // Count conversation messages to determine response strategy
    const userMessageCount = trimmedMessages.filter(m => m.role === 'user').length;
    const isEarlyConversation = userMessageCount < 10;
    
    // Professional therapist prompt for natural, responsive sessions
    const conversationFlowPrompt = `You are a warm, experienced counselor having a natural conversation. Follow these conversation style rules exactly:

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

If serious self-harm mentioned: [SAFETY_CRISIS_DETECTED]

Current conversation stage: ${isEarlyConversation ? 'Information gathering phase' : 'Ready for deeper support and guidance'}`;
    
    // Get user session and profile data
    const { getServerSession } = await import('next-auth/next');
    const { authOptions } = await import('../auth/[...nextauth]');
    const prisma = (await import('../../../lib/prisma')).default;
    
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
        logWithTimestamp('User profile loaded for streaming:', userProfile?.fullName);
      } catch (error) {
        logWithTimestamp('Error loading user profile for streaming:', error);
      }
    }
    
    // Prepare setup context
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
    
    const systemPrompt = conversationFlowPrompt + '\n\n' + (typeof getSessionPrompt === 'function' ? getSessionPrompt(problemType, userInfo) : '') + (relevantContext ? `\n\nRelevant context for this conversation:\n${relevantContext}` : '') + setupContext + profileContext;
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
    // Automatic retry logic for 429 errors
    let retries = 0;
    let maxRetries = 5;
    const retryDelays = [5000, 10000, 20000, 40000, 80000]; // 5s, 10s, 20s, 40s, 80s
    let gotResponse = false;
    let response;
    while (retries < maxRetries && !gotResponse) {
      logOpenAIRPM();
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.8,
          messages: [systemMessage, ...trimmedMessages],
          stream: true
        })
      });
      logWithTimestamp('OpenAI response status:', response.status);
      // Handle non-OK responses explicitly to avoid hanging client UI
      if (!response.ok) {
        try {
          const errText = await response.text();
          logWithTimestamp('OpenAI non-OK response body:', errText);
          res.write(`event: error\ndata: OpenAI error (${response.status}): ${errText}\n\n`);
        } catch (e) {
          logWithTimestamp('Failed to read OpenAI error body');
          res.write(`event: error\ndata: OpenAI error (${response.status}).\n\n`);
        }
        res.end();
        return;
      }
      if (response.status === 429) {
        if (retries < maxRetries - 1) {
          const retryDelayMs = retryDelays[retries];
          res.write(`event: info\ndata: Rate limited by OpenAI, retrying in ${retryDelayMs / 1000} seconds... (attempt ${retries + 1} of ${maxRetries})\n\n`);
          logWithTimestamp(`Rate limited, waiting ${retryDelayMs / 1000} seconds before retrying... (attempt ${retries + 1})`);
          await new Promise(r => setTimeout(r, retryDelayMs + Math.floor(Math.random() * 1000)));
        }
        retries++;
        continue;
      }
      gotResponse = true;
    }
    if (!gotResponse || !response.body) {
      res.write('event: error\ndata: We are receiving many requests at once. Please wait a moment and try again.\n\n');
      res.end();
      logWithTimestamp('Sent 429 rate limit error to client after retries');
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        buffer += decoder.decode(value);
        // OpenAI streams data as lines starting with 'data: '
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Save incomplete line for next chunk
        for (const line of lines) {
          if (line.trim().startsWith('data:')) {
            const data = line.replace('data: ', '').trim();
            if (data === '[DONE]') {
              res.write('event: done\ndata: [DONE]\n\n');
              res.end();
              console.log('Stream done, ended');
              return;
            }
            try {
              const json = JSON.parse(data);
              let content = json.choices?.[0]?.delta?.content;
              
              // POST-PROCESSING CLEANUP: Fix broken bullet formatting
              if (content) {
                // Fix accidental inline bullets like: "...day: * First... * Second..."
                content = content.replace(/([^\n])(\* )/g, '$1\n\n$2');

                // Ensure double newline before lists (if accidentally attached to paragraph)
                content = content.replace(/([^:\n])(\n\* )/g, '$1\n\n* ');

                // Prevent multiple bullets on same line
                content = content.replace(/\* (.+?)\* /g, '* $1\n\n* ');
              }
              
              // SAFETY TOKEN REPLACEMENT
              if (content && content.includes('[SAFETY_CRISIS_DETECTED]')) {
                content = content.replace(
                  '[SAFETY_CRISIS_DETECTED]',
                  'I care about your safety. If you feel at risk of harming yourself or someone else, please contact local emergency services or a licensed professional immediately. You are not alone.'
                );
              }
              if (content) {
                res.write(`data: ${content}\n\n`);
                if (res.flush) res.flush();
                console.log('Sent chunk:', content);
              }
            } catch (err) {
              // Ignore JSON parse errors for non-JSON lines
            }
          }
        }
      }
    }
    res.end();
    console.log('Stream ended');
    return;
  } catch (error) {
    res.write(`event: error\ndata: ${error.message}\n\n`);
    res.end();
    console.error('Handler error:', error);
  }
} 