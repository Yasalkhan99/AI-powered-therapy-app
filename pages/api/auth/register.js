import bcrypt from 'bcryptjs';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Basic server configuration sanity-checks (helps avoid opaque 500s)
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      message: 'Server configuration error: DATABASE_URL is not set',
    });
  }

  const { email, password } = req.body || {};

  // Validate inputs
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // Match frontend rules: at least 8 chars, upper, lower, number, special
  const passwordChecks = [
    (pw) => pw.length >= 8,
    (pw) => /[A-Z]/.test(pw),
    (pw) => /[a-z]/.test(pw),
    (pw) => /[0-9]/.test(pw),
    (pw) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(pw),
  ];
  const isPasswordValid = passwordChecks.every((test) => test(password));
  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Password does not meet complexity requirements' });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user in the database
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        setupCompleted: false, // Explicitly set setupCompleted to false for new users
      },
    });

    // Respond with success
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        setupCompleted: false
      }
    });

  } catch (error) {
    // Handle known Prisma errors for clearer responses
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Unique constraint failed
        return res.status(409).json({ message: 'User with this email already exists' });
      }
    }

    // Initialization / connection issues (e.g., missing env or DB down)
    const message =
      typeof error?.message === 'string' && error.message.includes('Environment variable not found: DATABASE_URL')
        ? 'Server configuration error: DATABASE_URL is not set'
        : 'An error occurred during registration';

    console.error('Registration error:', error);
    res.status(500).json({ message });
  }
} 