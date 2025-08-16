import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const totalSessions = await prisma.chatSession.count({
      where: {
        userId: session.user.id
      }
    });

    // Get sessions with pagination and sorting
    const sessions = await prisma.chatSession.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take: parseInt(limit),
      select: {
        id: true,
        createdAt: true,
        duration: true,
        moodScore: true,
        summary: true,
        messages: {
          select: {
            content: true,
            role: true,
            timestamp: true
          }
        }
      }
    });

    // Format the response
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      date: session.createdAt,
      duration: session.duration,
      mood: session.moodScore,
      summary: session.summary,
      messageCount: session.messages.length
    }));

    return res.status(200).json({
      sessions: formattedSessions,
      pagination: {
        total: totalSessions,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalSessions / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Chat history error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 