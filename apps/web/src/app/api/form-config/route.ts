import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

const WRITE_ROLES = ['super_admin', 'school_admin', 'principal'];

/**
 * GET /api/form-config?schoolId=xxx&formId=admission_form
 * Returns all role configs for the given school+form.
 * fieldRules format (new): { fieldId: { visible, editable, required, label? } }
 * fieldRules format (legacy): { fieldId: 'required'|'optional'|'hidden' }
 * Both formats may be present depending on when the config was last saved.
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    const { searchParams } = new URL(request.url);
    const isSuperAdmin = primary.role_code === 'super_admin';
    // Only super_admin may query another school's config (e.g. from the admin portal)
    const schoolId = (isSuperAdmin && searchParams.get('schoolId'))
      ? searchParams.get('schoolId')!
      : (primary.school_id ?? searchParams.get('schoolId'));
    const formId   = searchParams.get('formId');
    if (!schoolId) throw new ForbiddenError('No school');

    const where: any = { schoolId };
    if (formId) where.formId = formId;

    const rows = await prisma.formConfig.findMany({ where });
    // { [formId]: { [role]: fieldRules } }
    const result: Record<string, Record<string, Record<string, any>>> = {};
    for (const row of rows) {
      if (!result[row.formId]) result[row.formId] = {};
      result[row.formId][row.role] = row.fieldRules as Record<string, any>;
    }
    return Response.json({ configs: result });
  } catch (err) { return handleError(err); }
}

/**
 * POST /api/form-config
 * Body: { schoolId?, formId, role, fieldRules: { fieldId: { visible, editable, required, label? } } }
 * Upserts a single role config for a form.
 */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!WRITE_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { formId, role, fieldRules } = body;
    // Only super_admin may target a different school; all others are locked to their own school
    const isSuperAdmin = primary.role_code === 'super_admin';
    const schoolId: string = (isSuperAdmin && body.schoolId) ? body.schoolId : primary.school_id;
    if (!schoolId || !formId || !role || !fieldRules) {
      return Response.json({ error: 'schoolId, formId, role and fieldRules are required' }, { status: 400 });
    }

    const config = await prisma.formConfig.upsert({
      where:  { schoolId_formId_role: { schoolId, formId, role } },
      update: { fieldRules, updatedAt: new Date() },
      create: { schoolId, formId, role, fieldRules },
    });
    return Response.json({ config });
  } catch (err) { return handleError(err); }
}
