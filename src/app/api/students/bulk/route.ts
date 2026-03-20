import { getUserFromRequest } from '@/lib/auth';
import { getStudentTemplate, bulkUploadStudents } from '@/modules/students/student.service';
import { listClasses } from '@/modules/classes/class.service';
import { csvDownloadResponse } from '@/services/upload.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

/**
 * GET /api/students/bulk
 * Returns an empty CSV template for bulk student import.
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');

    const csv = getStudentTemplate();
    return csvDownloadResponse(csv, 'students-template.csv');
  } catch (err) { return handleError(err); }
}

/**
 * POST /api/students/bulk
 * Body: multipart/form-data  { file: CSV }
 * Returns: { created, errors, total }
 */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');

    const schoolId = primaryRole.school_id;
    if (!schoolId) throw new AppError('No school associated with this account');

    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) throw new AppError('CSV file is required');

    // Load current classes so we can resolve "5 A" → classId
    const classes = await listClasses(schoolId);
    const classMap = classes.map((c) => ({ id: c.id, grade: c.grade, section: c.section }));

    const csvText = await file.text();
    const result  = await bulkUploadStudents(schoolId, csvText, classMap);
    return Response.json(result);
  } catch (err) { return handleError(err); }
}
