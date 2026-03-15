import { parsePagination } from '@/utils/pagination';
import { AppError } from '@/utils/errors';
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
