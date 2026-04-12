import { getUserFromRequest } from '@/lib/auth';
import {
  findDefaultSchool,
  findFormConfigsBySchool,
  upsertFormConfig,
} from '@/modules/super-admin/super-admin.repo';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import { cacheGet, cacheSet, cacheInvalidate, TTL } from '@/lib/redis';

const WRITE_ROLES = ['super_admin', 'school_admin', 'principal'];

/**
 * GET /api/form-config?schoolId=xxx&formId=admission_form
 *
 * Always returns the Super Admin (default school) config as the base.
 * If the requesting school has local overrides, those are merged on top
 * at field level — Super Admin config is the live source of truth.
 *
 * Response: { configs: { [formId]: { [role]: { [fieldId]: FieldRule } } } }
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId') ?? undefined;
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = searchParams.get('schoolId') ?? primary?.school_id ?? '';

    // ── Cache check ────────────────────────────────────────────────────────────
    const cacheKey = `fc:${schoolId}:${formId ?? 'all'}`;
    const cached = await cacheGet<{ configs: Record<string, any> }>(cacheKey);
    if (cached) return Response.json(cached);

    // ── DB query ───────────────────────────────────────────────────────────────
    const defaultSchool = await findDefaultSchool();
    if (!defaultSchool) return Response.json({ configs: {} });

    const superAdminRows = await findFormConfigsBySchool(defaultSchool.id, formId);

    // Build base config from Super Admin
    const result: Record<string, Record<string, Record<string, any>>> = {};
    for (const row of superAdminRows) {
      if (!result[row.formId]) result[row.formId] = {};
      result[row.formId][row.role] = row.fieldRules as Record<string, any>;
    }

    // If requesting school is NOT the default school, merge its overrides on top
    if (schoolId && schoolId !== defaultSchool.id) {
      const schoolRows = await findFormConfigsBySchool(schoolId, formId);
      for (const row of schoolRows) {
        if (!result[row.formId]) result[row.formId] = {};
        const saRules = result[row.formId][row.role] ?? {};
        const schoolRules = row.fieldRules as Record<string, any>;
        result[row.formId][row.role] = {
          ...saRules,
          ...Object.fromEntries(
            Object.entries(schoolRules).map(([fieldId, rule]) => [
              fieldId,
              typeof rule === 'object' && rule !== null
                ? { ...(saRules[fieldId] ?? {}), ...rule }
                : rule,
            ]),
          ),
        };
      }
    }

    const payload = { configs: result };
    await cacheSet(cacheKey, payload, TTL.formConfig);
    return Response.json(payload);
  } catch (err) { return handleError(err); }
}

/**
 * POST /api/form-config
 * Body: { schoolId?, formId, role, fieldRules }
 *
 * Super Admin saves to the default school (template).
 * School Admin saves to their own school (local override).
 */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!WRITE_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { formId, role, fieldRules } = body;
    if (!formId || !role || !fieldRules) {
      return Response.json({ error: 'formId, role and fieldRules are required' }, { status: 400 });
    }

    let schoolId: string;
    if (primary.role_code === 'super_admin') {
      // Super Admin always saves to the default school (template)
      const defaultSchool = await findDefaultSchool();
      if (!defaultSchool) return Response.json({ error: 'No default school configured' }, { status: 400 });
      schoolId = body.schoolId ?? defaultSchool.id;
    } else {
      schoolId = body.schoolId ?? primary.school_id;
    }

    if (!schoolId) return Response.json({ error: 'schoolId is required' }, { status: 400 });

    const config = await upsertFormConfig(schoolId, formId, role, fieldRules);

    // Invalidate cache: SA changes affect all schools; school changes affect only that school
    if (primary.role_code === 'super_admin') {
      await cacheInvalidate('fc:*');   // everyone reads SA as base
    } else {
      await cacheInvalidate(`fc:${schoolId}:*`);
    }

    return Response.json({ config });
  } catch (err) { return handleError(err); }
}
