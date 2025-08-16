import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  if (req.method === 'GET') {
    if (req.query.last) {
      // Return the most recent setup for this user
      const setup = await prisma.voiceSessionSetup.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json({ setup });
    }
    if (req.query.setupId) {
      // Return the setup by ID (if it belongs to the user)
      const setup = await prisma.voiceSessionSetup.findUnique({
        where: { id: req.query.setupId },
      });
      if (!setup || setup.userId !== user.id) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.status(200).json({ setup });
    }
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (req.method === 'POST') {
    console.log('Received POST request body:', req.body);
    
    const { 
      therapistId, 
      therapistName, 
      language, 
      supportType, 
      voiceId,
      voiceName,
      voiceGender
    } = req.body;
    
    console.log('Extracted fields:', {
      therapistId,
      therapistName,
      language,
      supportType,
      voiceId,
      voiceName,
      voiceGender
    });
    
    if (!therapistId || !therapistName || !language || !supportType) {
      console.log('Validation failed - missing fields:', {
        hasTherapistId: !!therapistId,
        hasTherapistName: !!therapistName,
        hasLanguage: !!language,
        hasSupportType: !!supportType
      });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const setupData = {
      userId: user.id,
      therapistId,
      therapistName,
      language,
      supportType,
      voiceId: voiceId || null,
      voiceName: voiceName || null,
      voiceGender: voiceGender || 'female',
    };
    
    console.log('Creating setup with data:', setupData);
    
    try {
      const setup = await prisma.voiceSessionSetup.create({
        data: setupData,
      });
      console.log('Setup created successfully:', setup);
      return res.status(200).json({ success: true, setup });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Database error: ' + dbError.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 