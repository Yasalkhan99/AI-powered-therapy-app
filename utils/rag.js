import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Initialize text splitter
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

// Initialize Pinecone (new SDK style)
export function initializePinecone() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  return pinecone.index(process.env.PINECONE_INDEX);
}

// Store documents in Pinecone
export async function storeDocuments(documents) {
  const index = initializePinecone();
  const docs = await textSplitter.createDocuments(documents);
  
  const vectors = await Promise.all(
    docs.map(async (doc) => {
      const embedding = await embeddings.embedQuery(doc.pageContent);
      return {
        id: Math.random().toString(36).substring(7),
        values: embedding,
        metadata: {
          text: doc.pageContent,
          ...doc.metadata,
        },
      };
    })
  );

  // Flatten metadata to only allow primitives (string, number, boolean, list of strings)
  function filterMetadata(meta) {
    const result = {};
    for (const key in meta) {
      const value = meta[key];
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        (Array.isArray(value) && value.every(v => typeof v === 'string'))
      ) {
        result[key] = value;
      }
      // else skip (e.g., objects like 'loc')
    }
    return result;
  }

  const filteredVectors = vectors.map(v => ({
    ...v,
    metadata: v.metadata ? filterMetadata(v.metadata) : undefined
  }));
  console.log('Vectors to upsert:', Array.isArray(filteredVectors), filteredVectors.length, JSON.stringify(filteredVectors[0], null, 2));
  await index.upsert(filteredVectors);
}

// Retrieve relevant context
export async function retrieveContext(query, k = 3) {
  const index = initializePinecone();
  const queryEmbedding = await embeddings.embedQuery(query);
  
  const searchResponse = await index.query({
    vector: queryEmbedding,
    topK: k,
    includeMetadata: true,
  });

  return searchResponse.matches.map(match => match.metadata.text);
}

// Add therapy-specific content to the knowledge base
export const therapyContent = [
  // Simple, casual therapy-related sample questions
  { content: "I've been feeling low lately, can you help?", metadata: { type: "sample-question-casual" } },
  { content: "I don't know why I feel so anxious all the time.", metadata: { type: "sample-question-casual" } },
  { content: "Can we talk about my stress at work?", metadata: { type: "sample-question-casual" } },
  { content: "I can't sleep properly these days, what should I do?", metadata: { type: "sample-question-casual" } },
  { content: "How can I stop overthinking everything?", metadata: { type: "sample-question-casual" } },
  { content: "I'm having trouble focusing, any advice?", metadata: { type: "sample-question-casual" } },
  { content: "Why do I feel so tired even after sleeping?", metadata: { type: "sample-question-casual" } },
  { content: "I just feel stuck in life, can you guide me?", metadata: { type: "sample-question-casual" } },
  { content: "How do I deal with negative thoughts?", metadata: { type: "sample-question-casual" } },
  { content: "I keep worrying about the future, how can I stop?", metadata: { type: "sample-question-casual" } },
  { content: "Can you help me calm down right now?", metadata: { type: "sample-question-casual" } },
  { content: "I feel lonely all the time, what should I do?", metadata: { type: "sample-question-casual" } },
  { content: "Is it normal to feel sad without any reason?", metadata: { type: "sample-question-casual" } },
  { content: "I get nervous when talking to people, can you help?", metadata: { type: "sample-question-casual" } },
  { content: "How can I manage my anger better?", metadata: { type: "sample-question-casual" } },
  { content: "I don't feel motivated to do anything.", metadata: { type: "sample-question-casual" } },
  { content: "Can you guide me through a breathing exercise?", metadata: { type: "sample-question-casual" } },
  { content: "I feel like I'm not good enough.", metadata: { type: "sample-question-casual" } },
  { content: "I'm struggling with my relationship, can we talk?", metadata: { type: "sample-question-casual" } },
  { content: "I have panic attacks, how can I handle them?", metadata: { type: "sample-question-casual" } },
  // Added short, direct emotional phrases
  { content: "I am sad.", metadata: { type: "sample-question-casual" } },
  { content: "I feel alone.", metadata: { type: "sample-question-casual" } },
  { content: "I'm feeling low.", metadata: { type: "sample-question-casual" } },
  { content: "I'm not okay.", metadata: { type: "sample-question-casual" } },
  { content: "I feel empty.", metadata: { type: "sample-question-casual" } },
  { content: "I feel lost.", metadata: { type: "sample-question-casual" } },
  // Sample therapy-related questions for vector store
  { content: "How can I manage anxiety effectively?", metadata: { type: "sample-question" } },
  { content: "What are some techniques to reduce stress?", metadata: { type: "sample-question" } },
  { content: "How does cognitive behavioral therapy (CBT) work?", metadata: { type: "sample-question" } },
  { content: "Can you help me with managing my depression?", metadata: { type: "sample-question" } },
  { content: "What should I do when I feel overwhelmed?", metadata: { type: "sample-question" } },
  { content: "How can I improve my sleep quality?", metadata: { type: "sample-question" } },
  { content: "What are mindfulness practices for emotional wellbeing?", metadata: { type: "sample-question" } },
  { content: "How do I cope with grief and loss?", metadata: { type: "sample-question" } },
  { content: "Can you guide me through a breathing exercise?", metadata: { type: "sample-question" } },
  { content: "How do I handle panic attacks?", metadata: { type: "sample-question" } },
  { content: "What are some grounding techniques for anxiety?", metadata: { type: "sample-question" } },
  { content: "How can I build better self-esteem?", metadata: { type: "sample-question" } },
  { content: "How can I set healthy boundaries in relationships?", metadata: { type: "sample-question" } },
  { content: "How do I deal with intrusive thoughts?", metadata: { type: "sample-question" } },
  { content: "What are some daily affirmations I can use?", metadata: { type: "sample-question" } },
  { content: "How can I control negative thoughts?", metadata: { type: "sample-question" } },
  { content: "What are the symptoms of burnout and how can I manage them?", metadata: { type: "sample-question" } },
  { content: "How do I identify triggers for my anxiety?", metadata: { type: "sample-question" } },
  { content: "How can I manage emotional eating habits?", metadata: { type: "sample-question" } },
  { content: "How do I find motivation during depressive episodes?", metadata: { type: "sample-question" } },
  // Anxiety Management
  {
    content: "When dealing with anxiety, it's important to practice deep breathing exercises. Inhale for 4 counts, hold for 4, and exhale for 4. This helps activate the parasympathetic nervous system and reduce physical symptoms of anxiety.",
    metadata: { type: "anxiety", technique: "breathing" }
  },
  {
    content: "Grounding techniques can help manage anxiety in the moment. The 5-4-3-2-1 technique involves identifying 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.",
    metadata: { type: "anxiety", technique: "grounding" }
  },
  {
    content: "Progressive muscle relaxation is an effective anxiety management technique. Systematically tense and relax different muscle groups, starting from your toes and moving up to your head.",
    metadata: { type: "anxiety", technique: "relaxation" }
  },

  // Depression Support
  {
    content: "For depression, maintaining a regular sleep schedule and engaging in physical activity can help improve mood. Even a 10-minute walk can release endorphins and improve your mental state.",
    metadata: { type: "depression", technique: "lifestyle" }
  },
  {
    content: "Behavioral activation is a key technique for depression. Break down daily activities into small, manageable steps and gradually increase engagement in pleasurable activities.",
    metadata: { type: "depression", technique: "behavioral" }
  },
  {
    content: "Cognitive restructuring helps with depression by identifying and challenging negative thought patterns. Ask yourself: 'Is this thought helpful? Is it based on facts? What's a more balanced way to look at this?'",
    metadata: { type: "depression", technique: "cognitive" }
  },

  // Relationship Counseling
  {
    content: "In relationship counseling, active listening involves giving full attention, reflecting back what you hear, and asking clarifying questions. This helps build understanding and trust between partners.",
    metadata: { type: "relationships", technique: "communication" }
  },
  {
    content: "The 'I' statement technique helps express feelings without blaming: 'I feel [emotion] when [specific situation] because [reason].' This promotes constructive dialogue and reduces defensiveness.",
    metadata: { type: "relationships", technique: "communication" }
  },
  {
    content: "Setting healthy boundaries in relationships involves clearly communicating your needs, limits, and expectations. It's important to be consistent and respectful when enforcing boundaries.",
    metadata: { type: "relationships", technique: "boundaries" }
  },

  // Stress Management
  {
    content: "Time management is crucial for stress reduction. Use the Eisenhower Matrix to prioritize tasks: urgent and important, important but not urgent, urgent but not important, and neither urgent nor important.",
    metadata: { type: "stress", technique: "management" }
  },
  {
    content: "Mindfulness meditation can reduce stress by bringing attention to the present moment. Start with just 5 minutes daily, focusing on your breath and gently bringing your mind back when it wanders.",
    metadata: { type: "stress", technique: "mindfulness" }
  },
  {
    content: "Self-care is essential for stress management. Create a daily routine that includes adequate sleep, healthy eating, regular exercise, and activities you enjoy.",
    metadata: { type: "stress", technique: "self-care" }
  },

  // Grief Support
  {
    content: "The grieving process is unique to each person. Allow yourself to feel all emotions without judgment. There's no 'right' way to grieve, and healing takes time.",
    metadata: { type: "grief", technique: "emotional" }
  },
  {
    content: "Creating rituals can help process grief. This might include writing letters to your loved one, creating a memory book, or establishing new traditions to honor their memory.",
    metadata: { type: "grief", technique: "ritual" }
  },
  {
    content: "Self-compassion is crucial during grief. Treat yourself with the same kindness you would offer a friend, acknowledging that grief is a natural response to loss.",
    metadata: { type: "grief", technique: "self-compassion" }
  },

  // Self-Esteem Building
  {
    content: "Challenge negative self-talk by identifying cognitive distortions like all-or-nothing thinking, overgeneralization, and mental filtering. Replace them with more balanced thoughts.",
    metadata: { type: "self-esteem", technique: "cognitive" }
  },
  {
    content: "Practice self-compassion by treating yourself with the same kindness you'd show a friend. Acknowledge your struggles without judgment and recognize that imperfection is part of being human.",
    metadata: { type: "self-esteem", technique: "self-compassion" }
  },
  {
    content: "Set realistic goals and celebrate small achievements. Break larger goals into manageable steps and acknowledge your progress, no matter how small.",
    metadata: { type: "self-esteem", technique: "goal-setting" }
  },

  // Crisis Support
  {
    content: "If someone expresses thoughts of self-harm, stay calm and listen without judgment. Ask directly about their intentions and ensure they're safe. Connect them with emergency services if needed.",
    metadata: { type: "crisis", technique: "intervention" }
  },
  {
    content: "During a panic attack, help the person focus on their breathing. Guide them through slow, deep breaths and remind them that the attack will pass. Stay present and offer reassurance.",
    metadata: { type: "crisis", technique: "support" }
  },
  {
    content: "For acute stress, use the STOP technique: Stop, Take a step back, Observe your thoughts and feelings, Proceed mindfully. This helps create space between the stressor and your response.",
    metadata: { type: "crisis", technique: "coping" }
  }
];

// Initialize the knowledge base
export async function initializeKnowledgeBase() {
  await storeDocuments(therapyContent.map(item => item.content));
}

// Create a new file utils/useBreakpoint.js
// This hook provides the current breakpoint and booleans for xs, sm, md, lg, xl
import { useState, useEffect } from 'react';

const breakpoints = {
  xs: 0,
  mobile: 360,  // 360-639
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1440,
};

function getBreakpoint(width) {
  if (width < breakpoints.sm) return 'xs';
  if (width < breakpoints.sm) return 'mobile';
  if (width < breakpoints.md) return 'sm';
  if (width < breakpoints.lg) return 'md';
  if (width < breakpoints.xl) return 'lg';
  if (width < breakpoints['2xl']) return 'xl';
  return '2xl';
}

export default function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [breakpoint, setBreakpoint] = useState(getBreakpoint(width));

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setBreakpoint(getBreakpoint(window.innerWidth));
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    width,
    breakpoint,
    isXs: breakpoint === 'xs',
    isMobile: breakpoint === 'mobile',
    isSm: breakpoint === 'sm',
    isMd: breakpoint === 'md',
    isLg: breakpoint === 'lg',
    isXl: breakpoint === 'xl',
    is2xl: breakpoint === '2xl',
  };
}

// Returns the highest similarity score between the query and therapyContent using Pinecone and OpenAI embeddings
export async function getTherapySimilarityScore(query) {
  const index = initializePinecone();
  const queryEmbedding = await embeddings.embedQuery(query);
  // Query Pinecone for top 1 match
  const searchResponse = await index.query({
    vector: queryEmbedding,
    topK: 1,
    includeMetadata: true,
    includeValues: false,
  });
  if (!searchResponse.matches || searchResponse.matches.length === 0) return 0;
  // Pinecone returns a score (higher = more similar, usually 0-1)
  return searchResponse.matches[0].score || 0;
} 