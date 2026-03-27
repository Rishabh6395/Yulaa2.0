import { getUserFromRequest } from '@/lib/auth';
import { listSubmissions } from '@/modules/homework/homework.service';
import { handleError, UnauthorizedError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ?? '';
    const submissions = await listSubmissions(id);
    return Response.json({ submissions });
  } catch (err) { return handleError(err); }
}
