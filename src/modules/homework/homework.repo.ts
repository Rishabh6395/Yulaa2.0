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
  attachments?: string[];
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

export async function upsertParentNote(homeworkId: string, studentId: string, feedback: string) {
  return prisma.homeworkSubmission.upsert({
    where:  { homeworkId_studentId: { homeworkId, studentId } },
    create: { homeworkId, studentId, feedback, status: 'parent_noted' },
    update: { feedback, status: 'parent_noted' },
  });
}

export async function upsertDoneStatus(homeworkId: string, studentId: string, status: string) {
  return prisma.homeworkSubmission.upsert({
    where:  { homeworkId_studentId: { homeworkId, studentId } },
    create: { homeworkId, studentId, status },
    update: { status },
  });
}

export async function findStudentSubmission(homeworkId: string, studentId: string) {
  return prisma.homeworkSubmission.findUnique({
    where:  { homeworkId_studentId: { homeworkId, studentId } },
    select: { feedback: true, status: true },
  });
}

export async function findAllSubmissionsForHomework(homeworkId: string) {
  const hw = await prisma.homework.findUnique({
    where:   { id: homeworkId },
    select:  { classId: true },
  });
  if (!hw) return [];

  const [students, submissions] = await Promise.all([
    prisma.student.findMany({
      where:   { classId: hw.classId, status: 'active' },
      select:  { id: true, firstName: true, lastName: true, admissionNo: true },
      orderBy: [{ firstName: 'asc' }],
    }),
    prisma.homeworkSubmission.findMany({
      where:  { homeworkId },
      select: { studentId: true, status: true, feedback: true },
    }),
  ]);

  const subMap = new Map(submissions.map(s => [s.studentId, s]));
  return students.map(s => ({
    student_id:    s.id,
    student_name:  `${s.firstName} ${s.lastName}`,
    admission_no:  s.admissionNo,
    status:        subMap.get(s.id)?.status   ?? 'pending',
    feedback:      subMap.get(s.id)?.feedback ?? null,
  }));
}

export async function findParentNote(homeworkId: string, studentId: string) {
  return prisma.homeworkSubmission.findUnique({
    where: { homeworkId_studentId: { homeworkId, studentId } },
    select: { feedback: true, status: true },
  });
}
