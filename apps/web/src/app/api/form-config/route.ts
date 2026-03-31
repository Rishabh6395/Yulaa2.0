import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

// Only admins may write configs; any authenticated user may read them
const WRITE_ROLES = ['super_admin', 'school_admin', 'principal'];

/**
 * GET /api/form-config?schoolId=xxx&formId=admission
 * Returns all role configs for the given school+form.
 * Any authenticated user can call this (teachers, parents, students need to
 * read their own role's config when opening forms).
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? primary.school_id;
    const formId   = searchParams.get('formId');
    if (!schoolId) throw new ForbiddenError('No school');

    const where: any = { schoolId };
    if (formId) where.formId = formId;

    const rows = await prisma.formConfig.findMany({ where });
    // { [formId]: { [role]: { fieldId: rule } } }
    const result: Record<string, Record<string, Record<string, string>>> = {};
    for (const row of rows) {
      if (!result[row.formId]) result[row.formId] = {};
      result[row.formId][row.role] = row.fieldRules as Record<string, string>;
    }
    return Response.json({ configs: result });
  } catch (err) { return handleError(err); }
}

/**
 * POST /api/form-config
 * Body: { schoolId, formId, role, fieldRules: { fieldId: 'required'|'optional'|'hidden' } }
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
    const schoolId: string = body.schoolId ?? primary.school_id;
    if (!schoolId || !formId || !role || !fieldRules) {
      return Response.json({ error: 'schoolId, formId, role and fieldRules are required' }, { status: 400 });
    }

    const config = await prisma.formConfig.upsert({
      where: { schoolId_formId_role: { schoolId, formId, role } },
      update: { fieldRules, updatedAt: new Date() },
      create: { schoolId, formId, role, fieldRules },
    });
    return Response.json({ config });
  } catch (err) { return handleError(err); }
}
