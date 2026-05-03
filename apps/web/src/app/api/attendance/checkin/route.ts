import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import { markAttendance } from '@/modules/attendance/attendance.service';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const result  = await markAttendance(primary.school_id!, user.id, {
      type:    'employee',
      action:  'punch_in',
      user_id: user.id,
    });
    return Response.json(result);
  } catch (err) { return handleError(err); }
}
