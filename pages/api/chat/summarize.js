import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

// Auto-summarization endpoint for long conversations
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { messages } = req.body;
  
  if (!Array.isArray(messages) || messages.length < 10) {
    return res.status(400).json({ error: "Need at least 10 messages to summarize" });
  }

  try {
    // Create a summary prompt focusing on key themes and progress
    const conversationText = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `Summarize this therapy conversation in 3-4 bullet points focusing on:
- Main issues discussed
- Emotional themes
- Any techniques or coping strategies mentioned
- Progress or insights gained

Conversation:
${conversationText}

Summary (be concise, focus on key themes):`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 200,
        messages: [
          { role: 'user', content: summaryPrompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;

    return res.status(200).json({ 
      summary,
      messageCount: messages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Summarization error:', error);
    return res.status(500).json({ error: 'Failed to generate summary' });
  }
}
