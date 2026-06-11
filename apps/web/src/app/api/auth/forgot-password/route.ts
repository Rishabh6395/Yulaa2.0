import prisma from '@/lib/prisma';
import { handleError, AppError } from '@/utils/errors';
import { sendPasswordResetOtpEmail } from '@/services/email.service';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const OTP_TTL_MINUTES = 10;
// 3 requests per hour per IP — prevents OTP flooding
const RL_MAX    = 3;
const RL_WINDOW = 60 * 60;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const { allowed, resetAt } = await rateLimit(`rl:forgot-pwd:${ip}`, RL_MAX, RL_WINDOW);
    if (!allowed) {
      const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
      return Response.json(
        { error: 'Too many password reset requests. Please try again later.', retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }

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

    // phone='reset' is the type marker; email is the lookup key
    await prisma.otpVerification.deleteMany({ where: { phone: 'reset', email: user.email, verified: false } });
    await prisma.otpVerification.create({ data: { phone: 'reset', email: user.email, otp, expiresAt } });

    // Always send via Brevo; also log OTP to console for dev debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n[FORGOT PASSWORD] OTP for ${user.email} : ${otp} (exp ${expiresAt.toISOString()})\n`);
    }
    await sendPasswordResetOtpEmail(user.email, user.firstName, otp, OTP_TTL_MINUTES);

    return Response.json({ ok: true, message: 'OTP sent to your registered email.' });
  } catch (err) {
    return handleError(err);
  }
}
