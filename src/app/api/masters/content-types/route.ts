import { getUserFromRequest } from '@/lib/auth';
import {
  findDefaultSchool,
  findContentTypesBySchool,
  upsertContentType,
  patchContentType,
} from '@/modules/super-admin/super-admin.repo';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

/**
 * GET /api/masters/content-types?schoolId=xxx&formName=add_student_form
 * Returns content type masters.
 * Always includes records from the Super Admin (default) school.
 * School-specific records supplement/override defaults.
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(request.url);
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = searchParams.get('schoolId') ?? primary?.school_id ?? '';
    const formName = searchParams.get('formName') ?? undefined;

    const defaultSchool = await findDefaultSchool();

    // Always get Super Admin's content types
    const defaultTypes = defaultSchool
      ? await findContentTypesBySchool(defaultSchool.id, formName)
      : [];

    // Get school-specific types (if different school)
    const schoolTypes =
      schoolId && defaultSchool && schoolId !== defaultSchool.id
        ? await findContentTypesBySchool(schoolId, formName)
        : [];

    // Merge: school-specific overrides default by formName+fieldSlot key
    const map = new Map<string, (typeof defaultTypes)[0]>();
    for (const ct of defaultTypes) map.set(`${ct.formName}:${ct.fieldSlot}`, ct);
    for (const ct of schoolTypes)   map.set(`${ct.formName}:${ct.fieldSlot}`, ct); // school wins

    const contentTypes = [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
    return Response.json({ contentTypes });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    let schoolId: string;
    if (primary.role_code === 'super_admin') {
      const defaultSchool = await findDefaultSchool();
      schoolId = body.schoolId ?? defaultSchool?.id;
    } else {
      schoolId = body.schoolId ?? primary.school_id;
    }
    if (!schoolId) return Response.json({ error: 'schoolId required' }, { status: 400 });

    const { formName, fieldSlot, fieldType, label, options, sortOrder } = body;
    if (!formName || !fieldSlot || !label?.trim()) {
      return Response.json({ error: 'formName, fieldSlot and label are required' }, { status: 400 });
    }

    const contentType = await upsertContentType(schoolId, { formName, fieldSlot, fieldType: fieldType ?? 'text', label, options, sortOrder });
    return Response.json({ contentType }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primary.role_code)) throw new ForbiddenError();
    const { id, ...data } = await request.json();
    const contentType = await patchContentType(id, data);
    return Response.json({ contentType });
  } catch (err) { return handleError(err); }
}
