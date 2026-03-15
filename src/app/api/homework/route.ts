import { getUserFromRequest } from '@/lib/auth';
import { listHomework, createHomework, updateHomework } from '@/modules/homework/homework.service';
import { handleError, UnauthorizedError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    return Response.json(await listHomework(primaryRole.school_id!, searchParams));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const homework    = await createHomework(primaryRole.school_id!, user.id, await request.json());
    return Response.json({ homework }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const homework = await updateHomework(await request.json());
    return Response.json({ homework });
  } catch (err) { return handleError(err); }
}
