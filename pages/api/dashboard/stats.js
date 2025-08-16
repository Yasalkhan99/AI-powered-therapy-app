import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";

export default async function handler(req, res) {
  console.log('🚀 Dashboard stats API called!');
  console.log('📅 Current time:', new Date().toISOString());
  console.log('🔍 Request method:', req.method);
  console.log('🔍 Request URL:', req.url);
  
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      console.log('❌ No session found');
      return res.status(401).json({ error: "Unauthorized" });
    }

  const userId = session.user.id;
  console.log('Dashboard API userId:', userId);
  const [sessions, checkins, voiceSetups] = await Promise.all([
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
  console.log('=== DASHBOARD STATS DEBUG ===');
  console.log('Found sessions:', sessions.length);
  console.log('Found checkins:', checkins.length);
  console.log('Found voiceSetups:', voiceSetups.length);
  console.log('Raw voiceSetups:', voiceSetups);

  // Calculate stats
  const now = new Date();
  // Use LOCAL time for all date calculations
  const getLocalDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  // Combine chat sessions and voice session setups for total stats
  // Only include voice sessions that have been completed (have sessionEndedAt)
  const completedVoiceSessions = voiceSetups.filter(vs => vs.sessionEndedAt);
  const allSessions = [
    ...sessions,
    ...completedVoiceSessions.map(vs => ({
      ...vs,
      type: 'voice',
      // Add default values for voice sessions that don't have these fields
      moodScore: null,
      duration: vs.actualDuration ? (vs.actualDuration / 60) : 0, // Use actual duration in minutes (don't round)
      title: `${vs.therapistName} - ${vs.supportType}`,
      summary: `Voice session with ${vs.therapistName}`,
      // Use session end time if available, otherwise use creation time
      createdAt: vs.sessionEndedAt || vs.createdAt,
      // Also store the original creation time for debugging
      originalCreatedAt: vs.createdAt
    }))
  ];
  
  console.log('Voice sessions debug:', {
    total: voiceSetups.length,
    completed: completedVoiceSessions.length,
    withDuration: completedVoiceSessions.filter(vs => vs.actualDuration).length,
    allVoiceSetups: voiceSetups.map(vs => ({
      id: vs.id,
      therapistName: vs.therapistName,
      sessionEndedAt: vs.sessionEndedAt,
      actualDuration: vs.actualDuration,
      createdAt: vs.createdAt
    })),
    completedVoiceSessions: completedVoiceSessions.map(vs => ({
      id: vs.id,
      therapistName: vs.therapistName,
      sessionEndedAt: vs.sessionEndedAt,
      actualDuration: vs.actualDuration,
      durationMinutes: vs.actualDuration ? (vs.actualDuration / 60) : 0
    }))
  });
  
  console.log('All sessions debug:', {
    chatSessions: sessions.length,
    voiceSessions: completedVoiceSessions.length,
    totalSessions: allSessions.length,
    allSessions: allSessions.map(s => ({
      id: s.id,
      type: s.type,
      createdAt: s.createdAt,
      duration: s.duration
    }))
  });
  
  // Calculate start of week (Monday, local time)
  const startOfWeek = getLocalDate(now);
  startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); // Monday (local)
  startOfWeek.setHours(0,0,0,0);
  
  console.log('Weekly calculation debug:', {
    now: now.toISOString(),
    startOfWeek: startOfWeek.toISOString(),
    allSessionsCount: allSessions.length,
    allSessionsDates: allSessions.map(s => ({
      id: s.id,
      type: s.type,
      createdAt: s.createdAt,
      localDate: getLocalDate(new Date(s.createdAt)).toISOString(),
      isThisWeek: getLocalDate(new Date(s.createdAt)) >= startOfWeek
    }))
  });
  
  const sessionsThisWeek = allSessions.filter(s => getLocalDate(new Date(s.createdAt)) >= startOfWeek);

  // Use both session moodScore and checkin mood for stats
  const allMoodScores = [
    ...sessions.filter(s => typeof s.moodScore === 'number').map(s => s.moodScore),
    ...checkins.filter(c => typeof c.mood === 'number').map(c => c.mood)
  ];
  const totalMood = allMoodScores.reduce((sum, m) => sum + m, 0);
  const moodCount = allMoodScores.length;

  // Calculate average mood for voice sessions only
  const voiceSessions = sessions.filter(s => s.type === 'voice' && typeof s.moodScore === 'number');
  const averageVoiceMood = voiceSessions.length
    ? (voiceSessions.reduce((sum, s) => sum + s.moodScore, 0) / voiceSessions.length).toFixed(1)
    : '5.0';

  const streak = calculateStreak(allSessions);
  const totalHours = allSessions.reduce((sum, s) => sum + (s.duration || 0) / 60, 0);
  


  // Calculate weekly breakdown (Mon-Sun, LOCAL time)
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekStart = getLocalDate(now);
  weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); // Monday (local)
  weekStart.setHours(0,0,0,0);
  const weekly = weekDays.map((day, i) => {
    const d = getLocalDate(weekStart);
    d.setDate(weekStart.getDate() + i);
    // Sessions for the day (LOCAL) - include both chat and voice sessions
    const daySessions = allSessions.filter(s => {
      const sd = new Date(s.createdAt);
      return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth() && sd.getDate() === d.getDate();
    });
    // Checkins for the day (LOCAL)
    const dayCheckins = checkins.filter(c => {
      const cd = new Date(c.createdAt);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth() && cd.getDate() === d.getDate();
    });
    // Mood: prefer session moodScore, fallback to checkin mood
    let mood = 0;
    if (daySessions.some(s => typeof s.moodScore === 'number')) {
      const moods = daySessions.filter(s => typeof s.moodScore === 'number').map(s => s.moodScore);
      mood = (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1);
    } else if (dayCheckins.length > 0) {
      mood = (dayCheckins.reduce((a, c) => a + c.mood, 0) / dayCheckins.length).toFixed(1);
    }
    return {
      day,
      mood,
      sessions: daySessions.length
    };
  });

  res.json({
    sessions,
    checkins,
    voiceSetups,
    stats: {
      sessionsThisWeek: sessionsThisWeek.length,
      averageMood: moodCount ? (totalMood / moodCount).toFixed(1) : null,
      averageVoiceMood,
      streak,
      totalHours: totalHours.toFixed(1),
      lastSession: allSessions[0] || null,
      milestones: [], // You can add logic for milestones here
    },
    weekly,
  });
  } catch (error) {
    console.error('❌ Dashboard stats API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper: Calculate streak (consecutive days with sessions)
function calculateStreak(sessions) {
  if (!sessions.length) return 0;
  // Sort sessions by createdAt descending (most recent first)
  const sorted = [...sessions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  // Normalize to local date (midnight)
  const getLocalDate = (date) => {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    return d;
  };
  
  console.log('Streak calculation debug:', {
    totalSessions: sessions.length,
    sortedSessions: sorted.map(s => ({
      id: s.id,
      type: s.type,
      createdAt: s.createdAt,
      localDate: getLocalDate(s.createdAt).toISOString()
    }))
  });
  
  let streak = 1;
  let prev = getLocalDate(sorted[0].createdAt);
  
  for (let i = 1; i < sorted.length; i++) {
    const curr = getLocalDate(sorted[i].createdAt);
    const diffDays = Math.round((prev - curr) / (1000 * 60 * 60 * 24));
    
    console.log(`Streak iteration ${i}:`, {
      prev: prev.toISOString(),
      curr: curr.toISOString(),
      diffDays: diffDays,
      currentStreak: streak
    });
    
    if (diffDays === 1) {
      streak++;
      prev = curr;
    } else if (diffDays === 0) {
      // Same day, skip
      continue;
    } else {
      break;
    }
  }
  
  console.log('Final streak:', streak);
  return streak;
} 