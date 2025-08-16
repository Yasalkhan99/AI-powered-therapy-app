import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { duration, moodScore, summary, messages, title, type, carePlan, riskScore } = req.body;

  // If only title (and/or summary) is provided, create an empty session
  if (title && (!messages || !Array.isArray(messages) || messages.length === 0)) {
    try {
      const chatSession = await prisma.chatSession.create({
        data: {
          userId: session.user.id,
          title,
          summary: summary || null,
          type: type || 'chat',
          carePlan: carePlan || undefined,
          riskScore: typeof riskScore === 'number' ? riskScore : undefined,
        },
      });
      return res.status(201).json({ session: chatSession });
    } catch (error) {
      console.error("Failed to create chat session:", error);
      return res.status(500).json({ error: "Failed to create chat session" });
    }
  }

  if (!Array.isArray(messages) || typeof duration !== "number") {
    return res.status(400).json({ error: "Invalid input" });
  }

  // Set title: use summary, else first user message, else 'Session'
  let sessionTitle = summary && summary.trim() ? summary : null;
  if (!sessionTitle) {
    const firstUserMsg = messages.find(m => m.role === 'user' && typeof m.content === 'string');
    sessionTitle = firstUserMsg ? firstUserMsg.content : 'Session';
  }

  try {
    const chatSession = await prisma.chatSession.create({
      data: {
        userId: session.user.id,
        duration,
        moodScore,
        summary,
        title: sessionTitle,
        type: type || 'chat',
        carePlan: carePlan || undefined,
        riskScore: typeof riskScore === 'number' ? riskScore : undefined,
        messages: {
          create: messages.map(m => ({
            content: m.content,
            role: m.role,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          })),
        },
      },
    });
    // Fire-and-forget: store summary in vector index (optional)
    try {
      const { storeDocuments } = await import('../../utils/rag');
      if (summary && summary.trim()) {
        await storeDocuments([{ pageContent: summary, metadata: { type: 'session-summary', sessionId: chatSession.id } }]);
      }
    } catch (e) {
      console.warn('Vector upsert skipped:', e?.message || e);
    }
    res.status(201).json({ chatSession });
  } catch (error) {
    console.error("Failed to save chat session:", error);
    res.status(500).json({ error: "Failed to save chat session" });
  }
} 