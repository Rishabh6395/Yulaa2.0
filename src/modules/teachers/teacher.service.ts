import bcrypt from 'bcryptjs';
import { AppError, NotFoundError } from '@/utils/errors';
import { parseCSV } from '@/services/upload.service';
import * as repo from './teacher.repo';
import type { TeacherRow } from './teacher.types';

export async function toggleTeacherStatus(teacherId: string, status: string) {
  if (!['active', 'inactive'].includes(status)) throw new AppError('status must be active or inactive');
  return repo.updateTeacherStatus(teacherId, status);
}

export async function listTeachers(schoolId: string): Promise<TeacherRow[]> {
  const teachers = await repo.findTeachersBySchool(schoolId);
  return teachers.map((t) => ({
    id:            t.id,
    employee_id:   t.employeeId,
    qualification: t.qualification,
    joining_date:  t.joiningDate,
    status:        t.status,
    first_name:    t.user.firstName,
    last_name:     t.user.lastName,
    email:         t.user.email,
    phone:         t.user.phone,
    avatar_url:    t.user.avatarUrl,
  }));
}

export async function createTeacher(schoolId: string, body: Record<string, any>) {
  const { email, password, first_name, last_name, phone, employee_id, qualification, joining_date } = body;

  if (!email || !password || !first_name || !last_name) {
    throw new AppError('email, password, first_name, and last_name are required');
  }

  const teacherRole = await repo.findTeacherRole();
  if (!teacherRole) throw new NotFoundError('Teacher role');

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await repo.createTeacherWithUser({
    schoolId,
    email,
    password,
    passwordHash,
    roleId:        teacherRole.id,
    firstName:     first_name,
    lastName:      last_name,
    phone:         phone         || null,
    employeeId:    employee_id   || null,
    qualification: qualification || null,
    joiningDate:   joining_date  || null,
  });

  return newUser.teachers[0];
}

export async function bulkUploadTeachers(schoolId: string, rows: Record<string, string>[]) {
  if (rows.length === 0) throw new AppError('File is empty or has no data rows');

  const teacherRole = await repo.findTeacherRole();
  if (!teacherRole) throw new NotFoundError('Teacher role');

  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 2;

    const email      = row['email']?.trim();
    const firstName  = row['first_name']?.trim();
    const lastName   = row['last_name']?.trim();
    const password   = row['password']?.trim() || 'Welcome@123';

    if (!email || !firstName || !lastName) {
      errors.push(`Row ${rowNum}: email, first_name, and last_name are required`);
      continue;
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      await repo.createTeacherWithUser({
        schoolId,
        email,
        password,
        passwordHash,
        roleId:        teacherRole.id,
        firstName,
        lastName,
        phone:         row['phone']         || null,
        employeeId:    row['employee_id']   || null,
        qualification: row['qualification'] || null,
        joiningDate:   row['joining_date']  || null,
      });
      created++;
    } catch (err: any) {
      errors.push(`Row ${rowNum} (${email}): ${err.message ?? 'insert failed'}`);
    }
  }

  return { created, errors, total: rows.length };
}

export function parseTeacherCSV(csvText: string): Record<string, string>[] {
  return parseCSV(csvText);
}
