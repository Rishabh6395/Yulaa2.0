import { getUserFromRequest } from '@/lib/auth';
import {
  getAttendanceTemplate,
  exportAttendanceCSV,
  bulkUploadAttendance,
} from '@/modules/attendance/attendance.service';
import { csvDownloadResponse } from '@/services/upload.service';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';

/**
 * GET /api/attendance/bulk
 *   ?action=template&class_id=X&date=YYYY-MM-DD  → empty CSV template with student roster
 *   ?action=export&class_id=X&date=YYYY-MM-DD    → filled CSV with current attendance data
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(request.url);
    const action  = searchParams.get('action');
    const classId = searchParams.get('class_id');
    const date    = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!classId) throw new AppError('class_id is required');
    if (action !== 'template' && action !== 'export') {
      throw new AppError('action must be "template" or "export"');
    }

    if (action === 'template') {
      const csv = await getAttendanceTemplate(classId, date);
      return csvDownloadResponse(csv, `attendance-template-${date}.csv`);
    }

    const csv = await exportAttendanceCSV(classId, date);
    return csvDownloadResponse(csv, `attendance-${date}.csv`);
  } catch (err) { return handleError(err); }
}

/**
 * POST /api/attendance/bulk
 * Body: multipart/form-data
 *   file     — CSV file
 *   class_id — target class UUID
 */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const schoolId    = primaryRole.school_id;
    if (!schoolId) throw new AppError('No school associated with this account');

    const form    = await request.formData();
    const file    = form.get('file') as File | null;
    const classId = form.get('class_id') as string | null;

    if (!file)    throw new AppError('CSV file is required');
    if (!classId) throw new AppError('class_id is required');

    const csvText = await file.text();
    const result  = await bulkUploadAttendance(schoolId, classId, user.id, csvText);

    return Response.json(result);
  } catch (err) { return handleError(err); }
}
