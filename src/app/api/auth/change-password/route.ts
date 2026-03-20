import { getUserFromRequest } from '@/lib/auth';
import { changePassword } from '@/modules/auth/auth.service';
import { handleError, UnauthorizedError } from '@/utils/errors';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    await changePassword(user.id, await request.json());
    return Response.json({ success: true });
  } catch (err) { return handleError(err); }
}
