import { AppError } from '@/utils/errors';
import * as repo from './class.repo';
import type { ClassRow } from './class.types';

export async function listClasses(schoolId: string): Promise<ClassRow[]> {
  const classes = await repo.findClassesBySchool(schoolId);
  return classes.map((c) => ({
    id:                    c.id,
    name:                  c.name || `${c.grade}-${c.section}`,
    grade:                 c.grade,
    section:               c.section,
    capacity:              c.maxStudents,
    academic_year:         c.academicYear,
    teacher_name:          c.classTeacher
      ? `${c.classTeacher.user.firstName} ${c.classTeacher.user.lastName}`
      : null,
    class_teacher_user_id: c.classTeacher?.user.id ?? null,
    student_count:         c._count.students,
  }));
}

export async function createClass(schoolId: string, body: Record<string, any>) {
  const { grade, section, class_teacher_id, academic_year, max_students, name } = body;
  if (!grade || !section) throw new AppError('grade and section are required');

  return repo.createClass({
    schoolId,
    grade,
    section,
    name:           name             || undefined,
    classTeacherId: class_teacher_id || null,
    academicYear:   academic_year    || undefined,
    maxStudents:    max_students     || undefined,
  });
}

export async function updateClass(schoolId: string, body: Record<string, any>) {
  const { id, grade, section, class_teacher_id, academic_year, max_students, name } = body;
  if (!id) throw new AppError('id is required');

  return repo.updateClass({
    id,
    schoolId,
    grade,
    section,
    name,
    classTeacherId: class_teacher_id,
    academicYear:   academic_year,
    maxStudents:    max_students,
  });
}
