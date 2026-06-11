import { z } from 'zod';
import { login } from '@/modules/auth/auth.service';
import { handleError, AppError } from '@/utils/errors';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { parseBody } from '@/lib/validate';

// 5 attempts per 15 minutes, keyed by IP + normalised identifier (G-006)
const LOGIN_MAX     = 5;
const LOGIN_WINDOW  = 15 * 60; // seconds

const LoginSchema = z.object({
  email:    z.string().min(1, 'Email or admission number is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: Request) {
  try {
    const body = await parseBody(LoginSchema, request);

    const ip         = clientIp(request);
    const identifier = (body.email ?? '').toString().toLowerCase().trim();
    const rlKey      = `rl:login:${ip}:${identifier}`;

    const { allowed, remaining, resetAt } = await rateLimit(rlKey, LOGIN_MAX, LOGIN_WINDOW);

    if (!allowed) {
      const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
      return Response.json(
        { error: 'Too many login attempts. Please try again later.', retryAfterSec },
        {
          status:  429,
          headers: {
            'Retry-After':       String(retryAfterSec),
            'X-RateLimit-Limit': String(LOGIN_MAX),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          },
        },
      );
    }

    const result = await login(body);

    return Response.json(result, {
      headers: {
        'X-RateLimit-Limit':     String(LOGIN_MAX),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset':     String(Math.ceil(resetAt / 1000)),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
