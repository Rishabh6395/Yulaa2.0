import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { handleError, AppError } from '@/utils/errors';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// 5 attempts per 15 minutes per IP — prevents OTP brute-force on reset flow
const RL_MAX    = 5;
const RL_WINDOW = 15 * 60;

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const { allowed, resetAt } = await rateLimit(`rl:reset-pwd:${ip}`, RL_MAX, RL_WINDOW);
    if (!allowed) {
      const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
      return Response.json(
        { error: 'Too many attempts. Please try again later.', retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }

    const { email, otp, newPassword } = await request.json();
    if (!email || !otp || !newPassword) throw new AppError('email, otp, and newPassword are required');
    if (newPassword.length < 8) throw new AppError('New password must be at least 8 characters');

    const record = await prisma.otpVerification.findFirst({
      where: { phone: 'reset', email: email.toLowerCase().trim(), otp, verified: false, expiresAt: { gt: new Date() } },
    });

    if (!record) throw new AppError('Invalid or expired OTP. Please request a new one.', 400);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) throw new AppError('User not found', 404);

    const hash = await bcrypt.hash(newPassword, 12);

    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data:  { passwordHash: hash, mustResetPassword: false },
      }),
      prisma.otpVerification.update({
        where: { id: record.id },
        data:  { verified: true },
      }),
    ]);

    return Response.json({ ok: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    return handleError(err);
  }
}
