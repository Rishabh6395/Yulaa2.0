import bcrypt from 'bcryptjs';
import { AppError, NotFoundError } from '@/utils/errors';
import * as repo from './teacher.repo';
import type { TeacherRow } from './teacher.types';

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
