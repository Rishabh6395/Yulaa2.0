import prisma from '@/lib/prisma';
import { handleError, AppError } from '@/utils/errors';
import { sendEmail } from '@/services/email.service';

const OTP_TTL_MINUTES = 10;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) throw new AppError('Email is required');

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!user || user.status !== 'active') {
      return Response.json({ ok: true, message: 'If that email exists, an OTP has been sent.' });
    }

    const otp       = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const key       = `reset:${user.email}`;

    // Reuse OtpVerification table — store email in phone field with 'reset:' prefix
    await prisma.otpVerification.deleteMany({ where: { phone: key, verified: false } });
    await prisma.otpVerification.create({ data: { phone: key, email: user.email, otp, expiresAt } });

    // Dev: log to console; production: send via email service
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n[FORGOT PASSWORD - DEV MODE] ──────────────────────`);
      console.log(`  Email : ${user.email}`);
      console.log(`  OTP   : ${otp}`);
      console.log(`  Exp   : ${expiresAt.toISOString()}`);
      console.log(`────────────────────────────────────────────────────\n`);
    } else {
      await sendEmail({
        to:      user.email,
        subject: 'Password Reset OTP',
        html:    `<p>Hi ${user.firstName},</p><p>Your password reset OTP is: <strong>${otp}</strong></p><p>Valid for ${OTP_TTL_MINUTES} minutes. Do not share it with anyone.</p>`,
        text:    `Your password reset OTP is: ${otp}. Valid for ${OTP_TTL_MINUTES} minutes.`,
      });
    }

    return Response.json({ ok: true, message: 'OTP sent to your registered email.' });
  } catch (err) {
    return handleError(err);
  }
}
