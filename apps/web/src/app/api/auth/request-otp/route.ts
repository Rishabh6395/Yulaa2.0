import { sendOtp } from '@/modules/otp/otp.service';
import { handleError, AppError } from '@/utils/errors';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// 3 OTP requests per 10 minutes per phone+IP (G-006)
// Prevents denial-of-wallet attacks via unbounded SMS to any phone number.
const OTP_MAX    = 3;
const OTP_WINDOW = 10 * 60; // seconds

/** POST /api/auth/request-otp — mobile phone login step 1, public */
export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone) throw new AppError('phone is required');

    const ip    = clientIp(request);
    const rlKey = `rl:otp:${ip}:${(phone as string).replace(/\s+/g, '')}`;

    const { allowed, remaining, resetAt } = await rateLimit(rlKey, OTP_MAX, OTP_WINDOW);

    if (!allowed) {
      const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
      return Response.json(
        { error: 'Too many OTP requests. Please wait before requesting another.', retryAfterSec },
        {
          status:  429,
          headers: { 'Retry-After': String(retryAfterSec) },
        },
      );
    }

    await sendOtp(phone);

    return Response.json(
      { success: true },
      {
        headers: {
          'X-RateLimit-Limit':     String(OTP_MAX),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset':     String(Math.ceil(resetAt / 1000)),
        },
      },
    );
  } catch (err) { return handleError(err); }
}
