import { getUserFromRequest } from '@/lib/auth';
import { getAttendance, markAttendance } from '@/modules/attendance/attendance.service';
import { handleError, UnauthorizedError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    return Response.json(await getAttendance(primaryRole.school_id!, searchParams));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const result      = await markAttendance(primaryRole.school_id!, user.id, await request.json());
    return Response.json(result);
  } catch (err) { return handleError(err); }
}
