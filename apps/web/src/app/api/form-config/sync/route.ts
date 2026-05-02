import { PRINCIPAL_ADMIN_ROLES as ALLOWED_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { syncFormConfigToSchool } from '@/modules/super-admin/super-admin.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';


/**
 * POST /api/form-config/sync
 * Body: { schoolId }
 * Copies FormConfig + ContentTypeMaster from the default (Super Admin template)
 * school to the target school. School Admin can only sync their own school.
 */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ALLOWED_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const targetSchoolId: string =
      primary.role_code === 'super_admin' ? (body.schoolId ?? primary.school_id) : primary.school_id;

    if (!targetSchoolId) return Response.json({ error: 'schoolId is required' }, { status: 400 });

    const result = await syncFormConfigToSchool(targetSchoolId);
    return Response.json({ success: true, ...result });
  } catch (err) { return handleError(err); }
}
