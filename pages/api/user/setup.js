import { getServerSession } from "next-auth/next";
import { authOptions } from "../../api/auth/[...nextauth]";
import prisma from '../../../lib/prisma';
import { unstable_update } from "next-auth/react";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the session to verify the user is authenticated
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      console.error('No session found during profile setup');
      return res.status(401).json({ message: 'Unauthorized - No session found' });
    }

    if (!session.user?.email) {
      console.error('No user email in session during profile setup');
      return res.status(401).json({ message: 'Unauthorized - Invalid session' });
    }

    // Debug: Check if user exists in database
    console.log('🔍 Checking if user exists in database for email:', session.user.email);
    const existingUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!existingUser) {
      console.error('❌ User not found in database for email:', session.user.email);
      console.error('Session user data:', session.user);
      return res.status(404).json({ 
        message: 'User not found in database. Please try logging in again.',
        debug: {
          email: session.user.email,
          userId: session.user.id,
          sessionExists: !!session
        }
      });
    }
    
    console.log('✅ User found in database:', {
      id: existingUser.id,
      email: existingUser.email,
      setupCompleted: existingUser.setupCompleted
    });

    const {
      fullName,
      age,
      gender,
      country,
      therapyFocus,
      therapyType,
      religion,
      description
    } = req.body;

    // Log the received data
    console.log('📝 Received profile setup data:', {
      email: session.user.email,
      fullName,
      age,
      gender,
      country,
      therapyFocus,
      therapyType,
      religion,
      description,
    });

    // Validate required fields
    if (!fullName || !age || !gender || !country || !therapyFocus || !therapyType) {
      const missingFields = [];
      if (!fullName) missingFields.push('fullName');
      if (!age) missingFields.push('age');
      if (!gender) missingFields.push('gender');
      if (!country) missingFields.push('country');
      if (!therapyFocus) missingFields.push('therapyFocus');
      if (!therapyType) missingFields.push('therapyType');
      
      console.error('❌ Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields 
      });
    }

    // Update the user profile
    console.log('🔄 Updating user profile...');
    const updatedUser = await prisma.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        fullName,
        age: parseInt(age),
        gender,
        country,
        therapyFocus,
        therapyType,
        religion: religion || null,
        description: description || null,
        setupCompleted: true,
      },
    });

    console.log('✅ Profile updated successfully for user:', updatedUser.email);

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        setupCompleted: updatedUser.setupCompleted,
      },
    });

  } catch (error) {
    console.error('❌ Profile setup error:', error);
    // Return a more specific error message if possible
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        message: 'User not found in database. Please try logging in again.',
        error: 'P2025 - No record found for update'
      });
    }
    return res.status(500).json({ 
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 