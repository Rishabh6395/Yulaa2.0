/**
 * POST /api/auth/refresh
 *
 * Exchanges a valid, non-revoked refresh token for a new short-lived access token.
 * Also rotates the refresh token (issues a new one, invalidates the old one).
 *
 * Body: { refreshToken: string }
 * Response: { token: string, refreshToken: string }
 *
 * Public route — no JWT required (listed in PUBLIC_PREFIXES).
 */
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { handleError, AppError, UnauthorizedError } from '@/utils/errors';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const REFRESH_TOKEN_TTL_DAYS = 30;
const ACCESS_TOKEN_EXPIRY    = '15m';

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const { allowed } = await rateLimit(`rl:refresh:${ip}`, 20, 60);
    if (!allowed) {
      return Response.json({ error: 'Too many refresh requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const { refreshToken } = body as { refreshToken?: string };
    if (!refreshToken) throw new AppError('refreshToken is required', 400);

    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: {
        user: {
          include: { userRoles: { include: { role: true, school: true } } },
        },
      },
    });

    if (!session) throw new UnauthorizedError('Invalid refresh token');
    if (session.revokedAt) throw new UnauthorizedError('Refresh token has been revoked');
    if (session.expiresAt < new Date()) throw new UnauthorizedError('Refresh token has expired');
    if (session.user.status !== 'active') throw new UnauthorizedError('Account is inactive');

    // Rotate: revoke old session, create new one
    const newRefreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400_000);

    await prisma.$transaction([
      prisma.userSession.update({
        where: { id: session.id },
        data:  { revokedAt: new Date() },
      }),
      prisma.userSession.create({
        data: {
          userId:       session.userId,
          refreshToken: newRefreshToken,
          expiresAt,
          userAgent:    request.headers.get('user-agent')?.slice(0, 300) ?? null,
          ipAddress:    ip,
        },
      }),
    ]);

    const roles = session.user.userRoles.map((ur) => ({
      role_code:  ur.role.code,
      school_id:  ur.schoolId,
      is_primary: ur.isPrimary,
    }));
    const primary = roles.find((r) => r.is_primary) ?? roles[0];

    const accessToken = signToken(
      { userId: session.userId, email: session.user.email, primaryRole: primary?.role_code, schoolId: primary?.school_id },
      ACCESS_TOKEN_EXPIRY,
    );

    return Response.json({ token: accessToken, refreshToken: newRefreshToken });
  } catch (err) { return handleError(err); }
}
