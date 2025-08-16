import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Return all user profile fields
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        fullName: true,
        age: true,
        gender: true,
        country: true,
        therapyType: true,
        therapyFocus: true,
        religion: true,
        description: true,
        setupCompleted: true,
      },
    });
    return res.status(200).json(user);
  }

  if (req.method === 'PUT') {
    const { fullName, age, gender, country, therapyType, therapyFocus, religion, description } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        fullName,
        age: age ? parseInt(age) : null,
        gender,
        country,
        therapyType,
        therapyFocus,
        religion,
        description,
      },
    });
    return res.status(200).json(updatedUser);
  }

  return res.status(405).json({ message: 'Method not allowed' });
} 