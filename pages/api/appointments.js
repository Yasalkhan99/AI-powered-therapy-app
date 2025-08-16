import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import prisma from '../../lib/prisma';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user.id;

  if (req.method === 'GET') {
    // Get all appointments for the user
    const appointments = await prisma.appointment.findMany({
      where: { userId },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
    return res.status(200).json({ appointments });
  }

  if (req.method === 'POST') {
    const { sessionType, date, time, title } = req.body;
    if (!sessionType || !date || !time || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Check for conflicts (same user, date, time)
    const conflict = await prisma.appointment.findFirst({
      where: { userId, date: new Date(date), time },
    });
    if (conflict) {
      return res.status(409).json({ error: 'You already have an appointment at this time.' });
    }
    const appointment = await prisma.appointment.create({
      data: {
        userId,
        sessionType,
        date: new Date(date),
        time,
        title,
        status: 'confirmed',
      },
    });
    return res.status(201).json({ appointment });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing appointment ID' });
    // Only allow user to cancel their own appointment
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment || appointment.userId !== userId) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    return res.status(200).json({ appointment: updated });
  }

  if (req.method === 'PUT') {
    const { id, date, time, title } = req.body;
    if (!id || !date || !time) return res.status(400).json({ error: 'Missing fields' });
    // Only allow user to reschedule their own appointment
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment || appointment.userId !== userId) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    // Check for conflicts
    const conflict = await prisma.appointment.findFirst({
      where: { userId, date: new Date(date), time, NOT: { id } },
    });
    if (conflict) {
      return res.status(409).json({ error: 'You already have an appointment at this time.' });
    }
    const updated = await prisma.appointment.update({
      where: { id },
      data: { date: new Date(date), time, title: title || appointment.title, status: 'confirmed' },
    });
    return res.status(200).json({ appointment: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 