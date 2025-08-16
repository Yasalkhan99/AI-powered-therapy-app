import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { sessionStartedAt, sessionEndedAt, actualDuration } = req.body;

    // Verify the voice session setup belongs to the current user
    const voiceSetup = await prisma.voiceSessionSetup.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!voiceSetup) {
      return res.status(404).json({ error: 'Voice session setup not found' });
    }

    // Update the voice session setup with timing information
    const updatedSetup = await prisma.voiceSessionSetup.update({
      where: { id: id },
      data: {
        sessionStartedAt: sessionStartedAt ? new Date(sessionStartedAt) : null,
        sessionEndedAt: sessionEndedAt ? new Date(sessionEndedAt) : null,
        actualDuration: actualDuration || null,
      },
    });

    res.json({ success: true, setup: updatedSetup });
  } catch (error) {
    console.error('Error updating voice session setup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 