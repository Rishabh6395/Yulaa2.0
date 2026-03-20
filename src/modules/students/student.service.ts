import { parsePagination } from '@/utils/pagination';
import { AppError } from '@/utils/errors';
import { parseCSV, generateCSV } from '@/services/upload.service';
import * as repo from './student.repo';
import type { StudentRow } from './student.types';

export async function listStudents(schoolId: string, searchParams: URLSearchParams) {
  const pagination = parsePagination(searchParams);
  const { total, students } = await repo.findStudents({
    schoolId,
    status:  searchParams.get('status')   ?? undefined,
    classId: searchParams.get('class_id') ?? undefined,
    search:  searchParams.get('search')   ?? undefined,
    ...pagination,
  });

  const rows: StudentRow[] = students.map((s) => ({
    id:               s.id,
    admission_no:     s.admissionNo,
    first_name:       s.firstName,
    last_name:        s.lastName,
    dob:              s.dateOfBirth,
    gender:           s.gender,
    admission_status: s.status,
    admission_date:   s.createdAt,
    photo_url:        s.photoUrl,
    address:          s.address,
    grade:            s.class?.grade    ?? null,
    section:          s.class?.section  ?? null,
    class_id:         s.classId,
    parents: s.parentStudents.map((ps) => ({
      name:  `${ps.parent.user.firstName} ${ps.parent.user.lastName}`,
      phone: ps.parent.user.phone,
      email: ps.parent.user.email,
    })),
  }));

  return {
    students:   rows,
    total,
    page:       pagination.page,
    limit:      pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function createStudent(schoolId: string, body: Record<string, any>) {
  const { admission_no, first_name, last_name, dob, gender, class_id, address, blood_group } = body;

  if (!admission_no || !first_name || !last_name) {
    throw new AppError('Required fields: admission_no, first_name, last_name');
  }

  return repo.createStudent({
    schoolId,
    admissionNo: admission_no,
    firstName:   first_name,
    lastName:    last_name,
    classId:     class_id   || null,
    dob:         dob        || null,
    gender:      gender     || null,
    address:     address    || null,
    bloodGroup:  blood_group || null,
  });
}

export async function updateStudent(body: Record<string, any>) {
  const { id, admission_status } = body;
  if (!id || !admission_status) {
    throw new AppError('id and admission_status are required');
  }
  return repo.updateStudentStatus(id, admission_status);
}

/** Returns an empty CSV template the admin can fill in and upload. */
export function getStudentTemplate(): string {
  return generateCSV([], [
    { key: 'admission_no', header: 'admission_no' },
    { key: 'first_name',   header: 'first_name' },
    { key: 'last_name',    header: 'last_name' },
    { key: 'dob',          header: 'dob' },
    { key: 'gender',       header: 'gender' },
    { key: 'class',        header: 'class' },
    { key: 'address',      header: 'address' },
    { key: 'blood_group',  header: 'blood_group' },
  ]);
}

/**
 * Parse a CSV of students and insert them in bulk.
 * The `class` column should be "Grade Section" e.g. "5 A" — matched against existing classes.
 */
export async function bulkUploadStudents(
  schoolId: string,
  csvText: string,
  classes: { id: string; grade: string; section: string }[],
) {
  const rows = parseCSV(csvText);
  if (rows.length === 0) throw new AppError('CSV is empty or has no data rows');

  // Build a lookup: "grade section" → classId
  const classMap = new Map<string, string>();
  for (const c of classes) {
    classMap.set(`${c.grade} ${c.section}`.toLowerCase(), c.id);
  }

  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2: header row + 1-indexed

    const admissionNo = row['admission_no']?.trim();
    const firstName   = row['first_name']?.trim();
    const lastName    = row['last_name']?.trim();

    if (!admissionNo || !firstName || !lastName) {
      errors.push(`Row ${rowNum}: admission_no, first_name, and last_name are required`);
      continue;
    }

    const classKey = row['class']?.trim().toLowerCase();
    const classId  = classKey ? (classMap.get(classKey) ?? null) : null;

    if (classKey && !classId) {
      errors.push(`Row ${rowNum}: class "${row['class']}" not found — skipped`);
      continue;
    }

    try {
      await repo.createStudent({
        schoolId,
        admissionNo,
        firstName,
        lastName,
        classId:    classId    || null,
        dob:        row['dob']         || null,
        gender:     row['gender']      || null,
        address:    row['address']     || null,
        bloodGroup: row['blood_group'] || null,
      });
      created++;
    } catch (err: any) {
      errors.push(`Row ${rowNum} (${admissionNo}): ${err.message ?? 'insert failed'}`);
    }
  }

  return { created, errors, total: rows.length };
}
