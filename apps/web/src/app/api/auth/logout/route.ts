/**
 * POST /api/auth/logout
 *
 * Revokes the current refresh token session.
 * Body: { refreshToken: string }   (optional — revokes specific session)
 * If refreshToken is omitted, revokes ALL sessions for the authenticated user.
 *
 * Authenticated route — requires valid access token.
 */
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const body = await request.json().catch(() => ({}));
    const { refreshToken } = body as { refreshToken?: string };

    if (refreshToken) {
      await prisma.userSession.updateMany({
        where: { userId: user.id, refreshToken, revokedAt: null },
        data:  { revokedAt: new Date() },
      });
    } else {
      // Revoke all active sessions for this user
      await prisma.userSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data:  { revokedAt: new Date() },
      });
    }

    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
