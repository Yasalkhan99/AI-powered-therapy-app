import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    console.log('Test API - userId:', userId);

    // Get all voice session setups for this user
    const voiceSetups = await prisma.voiceSessionSetup.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    console.log('Test API - Found voice setups:', voiceSetups.length);
    console.log('Test API - Voice setups:', voiceSetups);

    res.json({
      userId,
      totalVoiceSetups: voiceSetups.length,
      voiceSetups: voiceSetups.map(vs => ({
        id: vs.id,
        therapistName: vs.therapistName,
        sessionStartedAt: vs.sessionStartedAt,
        sessionEndedAt: vs.sessionEndedAt,
        actualDuration: vs.actualDuration,
        createdAt: vs.createdAt
      }))
    });
  } catch (error) {
    console.error('Test API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 