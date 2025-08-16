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
    console.log('Test All Sessions API - userId:', userId);

    // Get all session data
    const [chatSessions, checkins, voiceSetups] = await Promise.all([
      prisma.chatSession.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { messages: true },
      }),
      prisma.checkin.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.voiceSessionSetup.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    console.log('Test All Sessions API - Data found:', {
      chatSessions: chatSessions.length,
      checkins: checkins.length,
      voiceSetups: voiceSetups.length
    });

    // Calculate what the dashboard should show
    const now = new Date();
    const getLocalDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Only include completed voice sessions
    const completedVoiceSessions = voiceSetups.filter(vs => vs.sessionEndedAt);
    
    // Combine all sessions
    const allSessions = [
      ...chatSessions,
      ...completedVoiceSessions.map(vs => ({
        ...vs,
        type: 'voice',
        moodScore: null,
        duration: vs.actualDuration ? Math.round(vs.actualDuration / 60) : 0,
        title: `${vs.therapistName} - ${vs.supportType}`,
        summary: `Voice session with ${vs.therapistName}`,
        createdAt: vs.sessionEndedAt || vs.createdAt,
      }))
    ];

    // Calculate weekly sessions
    const startOfWeek = getLocalDate(now);
    startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    startOfWeek.setHours(0,0,0,0);
    const sessionsThisWeek = allSessions.filter(s => getLocalDate(new Date(s.createdAt)) >= startOfWeek);

    // Calculate total hours
    const totalHours = allSessions.reduce((sum, s) => sum + (s.duration || 0) / 60, 0);

    // Calculate streak
    const calculateStreak = (sessions) => {
      if (!sessions.length) return 0;
      const sorted = [...sessions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const getLocalDate = (date) => {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        return d;
      };
      let streak = 1;
      let prev = getLocalDate(sorted[0].createdAt);
      for (let i = 1; i < sorted.length; i++) {
        const curr = getLocalDate(sorted[i].createdAt);
        const diffDays = Math.round((prev - curr) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          streak++;
          prev = curr;
        } else if (diffDays === 0) {
          continue;
        } else {
          break;
        }
      }
      return streak;
    };

    const streak = calculateStreak(allSessions);

    res.json({
      userId,
      summary: {
        chatSessions: chatSessions.length,
        checkins: checkins.length,
        voiceSetups: voiceSetups.length,
        completedVoiceSessions: completedVoiceSessions.length,
        totalSessions: allSessions.length,
        sessionsThisWeek: sessionsThisWeek.length,
        totalHours: totalHours.toFixed(2),
        streak: streak
      },
      chatSessions: chatSessions.map(cs => ({
        id: cs.id,
        title: cs.title,
        createdAt: cs.createdAt,
        duration: cs.duration,
        moodScore: cs.moodScore
      })),
      checkins: checkins.map(c => ({
        id: c.id,
        mood: c.mood,
        energy: c.energy,
        createdAt: c.createdAt
      })),
      voiceSetups: voiceSetups.map(vs => ({
        id: vs.id,
        therapistName: vs.therapistName,
        sessionStartedAt: vs.sessionStartedAt,
        sessionEndedAt: vs.sessionEndedAt,
        actualDuration: vs.actualDuration,
        createdAt: vs.createdAt
      })),
      allSessions: allSessions.map(s => ({
        id: s.id,
        type: s.type,
        title: s.title,
        createdAt: s.createdAt,
        duration: s.duration
      }))
    });
  } catch (error) {
    console.error('Test All Sessions API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 