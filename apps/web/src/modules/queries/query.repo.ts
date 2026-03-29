import prisma from '@/lib/prisma';

const INCLUDE = {
  raisedBy: { select: { id: true, firstName: true, lastName: true } },
  replies: {
    orderBy: { createdAt: 'asc' as const },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  },
};

export async function findQueries(schoolId: string, userId: string, roleCode: string) {
  // Visibility rules:
  //   parent       → own queries only
  //   school_admin → parent queries for their school + their own queries
  //   super_admin  → school_admin queries from any school
  if (roleCode === 'super_admin') {
    return prisma.supportQuery.findMany({
      where: { raisedByRole: 'school_admin' },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
  }
  if (roleCode === 'school_admin') {
    return prisma.supportQuery.findMany({
      where: {
        schoolId,
        OR: [{ raisedByRole: 'parent' }, { raisedById: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
  }
  // parent / any other: own queries only
  return prisma.supportQuery.findMany({
    where: { schoolId, raisedById: userId },
    orderBy: { createdAt: 'desc' },
    include: INCLUDE,
  });
}

export async function findById(id: string) {
  return prisma.supportQuery.findUnique({ where: { id }, include: INCLUDE });
}

export async function findByTicket(ticketNo: string) {
  return prisma.supportQuery.findUnique({ where: { ticketNo } });
}

export async function createQuery(data: {
  ticketNo:     string;
  schoolId:     string;
  raisedById:   string;
  raisedByRole: string;
  queryType:    string | null;
  subject:      string;
  description:  string;
  attachments:  string[];
}) {
  return prisma.supportQuery.create({ data, include: INCLUDE });
}

export async function createReply(data: { queryId: string; userId: string; message: string }) {
  return prisma.supportQueryReply.create({
    data,
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export async function updateStatus(id: string, status: string) {
  return prisma.supportQuery.update({ where: { id }, data: { status } });
}
