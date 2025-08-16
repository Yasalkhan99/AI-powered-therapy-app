import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.query;

    // Get session details
    const sessionData = await prisma.chatSession.findUnique({
      where: {
        id: id,
        userId: session.user.id // Ensure user can only access their own sessions
      },
      include: {
        messages: {
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    if (!sessionData) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Format the response
    const formattedSession = {
      id: sessionData.id,
      date: sessionData.createdAt,
      duration: sessionData.duration,
      mood: sessionData.moodScore,
      summary: sessionData.summary,
      messageCount: sessionData.messages.length,
      messages: sessionData.messages.map(message => ({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp
      }))
    };

    return res.status(200).json(formattedSession);
  } catch (error) {
    console.error('Session details error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 