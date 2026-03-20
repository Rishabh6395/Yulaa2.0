import { getUserFromRequest } from '@/lib/auth';
import {
  getComplianceItems,
  getComplianceDashboard,
  addComplianceItem,
  initDefaultItems,
} from '@/modules/compliance/compliance.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

const ALLOWED_ROLES = new Set(['super_admin', 'school_admin']);

function getSchoolId(user: any): string {
  const role = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  return role.school_id;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r: any) => ALLOWED_ROLES.has(r.role_code))) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const category  = searchParams.get('category') ?? undefined;
    const dashboard = searchParams.get('dashboard') === '1';
    const schoolId  = getSchoolId(user);

    if (dashboard) return Response.json(await getComplianceDashboard(schoolId));
    return Response.json(await getComplianceItems(schoolId, category));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r: any) => ALLOWED_ROLES.has(r.role_code))) throw new ForbiddenError();

    const schoolId = getSchoolId(user);
    const body     = await request.json();

    // Seed default items action
    if (body.action === 'seed_defaults') {
      await initDefaultItems(schoolId, user.id);
      return Response.json({ message: 'Default compliance checklist created' }, { status: 201 });
    }

    const item = await addComplianceItem(schoolId, user.id, body);
    return Response.json(item, { status: 201 });
  } catch (err) { return handleError(err); }
}
