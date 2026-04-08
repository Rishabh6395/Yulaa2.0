import { getUserFromRequest } from '@/lib/auth';
import {
  findDefaultSchool,
  findFormConfigsBySchool,
  findContentTypesBySchool,
  bulkUpsertFormConfigs,
  bulkSyncContentTypes,
} from '@/modules/super-admin/super-admin.repo';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

/**
 * POST /api/form-config/sync
 * Body: { schoolId }
 * Copies FormConfig + ContentTypeMaster from the default (Super Admin template)
 * school to the target school. Useful as a one-time bootstrap for older schools.
 *
 * Note: With the new live-read approach, this is only needed for legacy data.
 * New configs are always read from Super Admin in real-time.
 */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const targetSchoolId: string =
      primary.role_code === 'super_admin' ? (body.schoolId ?? primary.school_id) : primary.school_id;

    if (!targetSchoolId) return Response.json({ error: 'schoolId is required' }, { status: 400 });

    const defaultSchool = await findDefaultSchool();
    if (!defaultSchool || defaultSchool.id === targetSchoolId) {
      return Response.json({ synced: 0, contentTypesSynced: 0 });
    }

    const [formConfigs, contentTypes] = await Promise.all([
      findFormConfigsBySchool(defaultSchool.id),
      findContentTypesBySchool(defaultSchool.id),
    ]);

    const [syncedConfigs, syncedTypes] = await Promise.all([
      bulkUpsertFormConfigs(
        targetSchoolId,
        formConfigs.map(c => ({ formId: c.formId, role: c.role, fieldRules: c.fieldRules })),
      ),
      bulkSyncContentTypes(
        targetSchoolId,
        contentTypes.map(ct => ({
          formName:  ct.formName,
          fieldSlot: ct.fieldSlot,
          fieldType: ct.fieldType,
          label:     ct.label,
          options:   ct.options,
          sortOrder: ct.sortOrder,
        })),
      ),
    ]);

    return Response.json({ success: true, synced: syncedConfigs.length, contentTypesSynced: syncedTypes.length });
  } catch (err) { return handleError(err); }
}
