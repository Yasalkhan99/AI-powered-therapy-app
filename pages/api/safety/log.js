import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";

// Safety event logging endpoint
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { 
    type, // 'high_risk', 'crisis_detected', 'prompt_injection', 'multiple_attempts'
    riskScore, 
    content, 
    sessionId,
    metadata 
  } = req.body;

  try {
    // Log to database (you can extend ChatSession or create new table)
    const logEntry = {
      userId: session.user.id,
      type,
      riskScore: riskScore || 0,
      content: content ? content.substring(0, 500) : null, // Truncate for storage
      sessionId,
      metadata: metadata || {},
      timestamp: new Date()
    };

    // For now, just console log (you can add to database later)
    console.log('SAFETY EVENT:', JSON.stringify(logEntry));

    // If high risk, you could trigger alerts here
    if (type === 'crisis_detected' || riskScore > 0.7) {
      console.warn('HIGH RISK USER - Manual review recommended:', session.user.email);
      // Could send webhook, email admin, etc.
    }

    return res.status(200).json({ logged: true });

  } catch (error) {
    console.error('Safety logging error:', error);
    return res.status(500).json({ error: 'Failed to log safety event' });
  }
}
