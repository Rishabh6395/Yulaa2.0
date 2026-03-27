import prisma from '@/lib/prisma';

export async function findQueries(schoolId: string) {
  return prisma.studentQuery.findMany({
    where: { schoolId },
    include: {
      student:        { select: { firstName: true, lastName: true } },
      parent:         { include: { user: { select: { firstName: true, lastName: true } } } },
      respondedByUser: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function findParentByUser(userId: string) {
  return prisma.parent.findUnique({ where: { userId } });
}

export async function createQuery(data: {
  schoolId:  string;
  studentId: string | null;
  parentId:  string | null;
  subject:   string;
  message:   string;
}) {
  return prisma.studentQuery.create({ data });
}

export async function respondToQuery(id: string, respondedBy: string, data: {
  response?: string;
  status?:   string;
}) {
  return prisma.studentQuery.update({
    where: { id },
    data:  { ...data, respondedBy, respondedAt: new Date() },
  });
}

export async function confirmResolveQuery(id: string) {
  return prisma.studentQuery.update({
    where: { id },
    data:  { status: 'resolved' },
  });
}

export async function reopenQuery(id: string, comment: string | undefined) {
  const note = comment?.trim()
    ? `[Reopened with comment: ${comment.trim()}]`
    : '[Reopened by submitter]';
  return prisma.studentQuery.update({
    where: { id },
    data:  { status: 'open', response: note },
  });
}
