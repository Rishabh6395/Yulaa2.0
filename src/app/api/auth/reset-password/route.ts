import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { handleError, AppError } from '@/utils/errors';

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json();
    if (!email || !otp || !newPassword) throw new AppError('email, otp, and newPassword are required');
    if (newPassword.length < 8) throw new AppError('New password must be at least 8 characters');

    const key    = `reset:${email.toLowerCase().trim()}`;
    const record = await prisma.otpVerification.findFirst({
      where: { phone: key, otp, verified: false, expiresAt: { gt: new Date() } },
    });

    if (!record) throw new AppError('Invalid or expired OTP. Please request a new one.', 400);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) throw new AppError('User not found', 404);

    const hash = await bcrypt.hash(newPassword, 10);

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
