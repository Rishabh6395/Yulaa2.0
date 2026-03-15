import prisma from '@/lib/prisma';

export async function findHomework(schoolId: string, classId?: string | null) {
  return prisma.homework.findMany({
    where: { schoolId, ...(classId && { classId }) },
    include: {
      class:   true,
      teacher: { include: { user: true } },
      _count:  { select: { submissions: true } },
    },
    orderBy: { dueDate: 'desc' },
  });
}

export async function countActiveStudentsInClass(classId: string) {
  return prisma.student.count({ where: { classId, status: 'active' } });
}

export async function findTeacherByUserAndSchool(userId: string, schoolId: string) {
  return prisma.teacher.findUnique({ where: { userId_schoolId: { userId, schoolId } } });
}

export async function createHomework(data: {
  schoolId:    string;
  classId:     string;
  teacherId:   string;
  subject:     string;
  title:       string;
  description: string | null;
  dueDate:     Date;
}) {
  return prisma.homework.create({ data });
}

export async function updateHomework(id: string, data: {
  subject?:     string;
  title?:       string;
  description?: string | null;
  dueDate?:     Date;
}) {
  return prisma.homework.update({ where: { id }, data });
}
