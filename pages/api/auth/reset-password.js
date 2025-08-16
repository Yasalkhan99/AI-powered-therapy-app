import prisma from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ message: 'Token and password required' });

  // Basic password strength alignment with register.js
  const passwordChecks = [
    (pw) => typeof pw === 'string' && pw.length >= 8,
    (pw) => /[A-Z]/.test(pw),
    (pw) => /[a-z]/.test(pw),
    (pw) => /[0-9]/.test(pw),
    (pw) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
  ];
  const isPasswordValid = passwordChecks.every((t) => t(password));
  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Password does not meet complexity requirements' });
  }

  // Find user by token
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gte: new Date() },
    },
  });
  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }

  // Hash new password
  const hashed = await bcrypt.hash(password, 10);

  // Update user password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return res.status(200).json({ message: 'Password reset successful' });
} 