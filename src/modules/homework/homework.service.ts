import { AppError, ForbiddenError } from '@/utils/errors';
import * as repo from './homework.repo';
import type { HomeworkRow } from './homework.types';

export async function listHomework(schoolId: string, searchParams: URLSearchParams): Promise<{ homework: HomeworkRow[] }> {
  const classId  = searchParams.get('class_id');
  const homework = await repo.findHomework(schoolId, classId);

  const rows = await Promise.all(
    homework.map(async (h) => {
      const totalStudents = await repo.countActiveStudentsInClass(h.classId);
      return {
        id:             h.id,
        subject:        h.subject,
        title:          h.title,
        description:    h.description,
        due_date:       h.dueDate,
        created_at:     h.createdAt,
        grade:          h.class.grade,
        section:        h.class.section,
        teacher_name:   `${h.teacher.user.firstName} ${h.teacher.user.lastName}`,
        submissions:    h._count.submissions,
        total_students: totalStudents,
      };
    })
  );

  return { homework: rows };
}

export async function createHomework(schoolId: string, userId: string, body: Record<string, any>) {
  const { class_id, subject, title, description, due_date } = body;
  if (!class_id || !subject || !title || !due_date) {
    throw new AppError('class_id, subject, title, and due_date are required');
  }

  const teacher = await repo.findTeacherByUserAndSchool(userId, schoolId);
  if (!teacher) throw new ForbiddenError('Teacher record not found');

  return repo.createHomework({
    schoolId,
    classId:     class_id,
    teacherId:   teacher.id,
    subject,
    title,
    description: description || null,
    dueDate:     new Date(due_date),
  });
}

export async function updateHomework(body: Record<string, any>) {
  const { id, subject, title, description, due_date } = body;
  if (!id) throw new AppError('id is required');

  return repo.updateHomework(id, {
    ...(subject          && { subject }),
    ...(title            && { title }),
    ...(description !== undefined && { description: description || null }),
    ...(due_date         && { dueDate: new Date(due_date) }),
  });
}
