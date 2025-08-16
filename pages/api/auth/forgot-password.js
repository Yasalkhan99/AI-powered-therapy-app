import prisma from '../../../lib/prisma';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  // Normalize email to avoid case/whitespace mismatches
  const normalizedEmail = String(email).trim().toLowerCase();

  // Find user
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    // Always return success to prevent email enumeration
    return res.status(200).json({ message: 'If an account exists for this email, a reset link has been sent.' });
  }

  // Generate token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  // Save token and expiry to user
  await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      resetToken: token,
      resetTokenExpiry: tokenExpiry,
    },
  });

  // --- SEND EMAIL ---
  const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password/${token}`;
  
  // Debug: Log the exact URL being generated
  console.log('🔗 Generated Reset URL:', resetUrl);
  console.log('🌐 NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
  console.log('🎫 Token:', token);

  // Email transport is optional in dev to make Postman testing easier
  const emailConfigReady = Boolean(
    (process.env.EMAIL_SERVICE || process.env.EMAIL_SERVER) &&
    (process.env.EMAIL_PORT || process.env.EMAIL_SERVICE) &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    (process.env.EMAIL_FROM || process.env.EMAIL_USER)
  );

  if (emailConfigReady) {
    try {
      const port = Number(process.env.EMAIL_PORT || '0');
      const useService = Boolean(process.env.EMAIL_SERVICE);
      const secure = port === 465 || String(process.env.EMAIL_SECURE).toLowerCase() === 'true';
      const transportOptions = useService
        ? {
            service: process.env.EMAIL_SERVICE,
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
          }
        : {
            host: process.env.EMAIL_SERVER,
            port: port || 587,
            secure,
            requireTLS: (port === 587) && !secure,
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
          };

      const transporter = nodemailer.createTransport(transportOptions);

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: normalizedEmail,
        subject: 'Reset your password',
        html: `
          <p>You requested a password reset for Clamia Therapist Bot.</p>
          <p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.</p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
        text: `Reset your password: ${resetUrl}`,
      });
    } catch (err) {
      // Do not fail the flow if email cannot be sent (dev/test friendliness)
      console.warn('Password reset email send failed:', err?.message || err);
      // In development, surface the error to caller for easier setup
      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({
          message: 'Email sending failed in development; see devEmailError for details. You can still use devResetToken to complete reset.',
          devResetToken: token,
          devResetUrl: resetUrl,
          devEmailError: String(err?.message || err),
        });
      }
    }
  }

  const shouldExposeToken = process.env.NODE_ENV !== 'production';
  const payload = shouldExposeToken
    ? { message: 'If an account exists for this email, a reset link has been sent.', devResetToken: token, devResetUrl: resetUrl }
    : { message: 'If an account exists for this email, a reset link has been sent.' };

  return res.status(200).json(payload);
} 