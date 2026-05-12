import prisma from '@/lib/prisma';

const INCLUDE = {
  raisedBy: { select: { id: true, firstName: true, lastName: true } },
  school:   { select: { id: true, name: true } },
  replies: {
    orderBy: { createdAt: 'asc' as const },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  },
};

// All non-admin roles that raise queries to school_admin
const SCHOOL_ROLES = ['parent', 'teacher', 'student', 'hod', 'principal', 'employee', 'vendor', 'consultant'];

export async function findQueries(schoolId: string | null, userId: string, roleCode: string) {
  if (roleCode === 'super_admin') {
    // Super admin sees all queries raised by school_admins
    return prisma.supportQuery.findMany({
      where: { raisedByRole: 'school_admin' },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
  }

  if (roleCode === 'school_admin') {
    // School admin sees: queries from any school role in their school + their own escalations
    return prisma.supportQuery.findMany({
      where: {
        schoolId: schoolId!,
        OR: [
          { raisedByRole: { in: SCHOOL_ROLES } },
          { raisedById: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
  }

  // All other roles: own queries only
  return prisma.supportQuery.findMany({
    where: { schoolId: schoolId!, raisedById: userId },
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
  priority:     string;
  subject:      string;
  description:  string;
  attachments:  string[];
}) {
  return prisma.supportQuery.create({ data, include: INCLUDE });
}

export async function createReply(data: {
  queryId:     string;
  userId:      string;
  message:     string;
  attachments: string[];
}) {
  return prisma.supportQueryReply.create({
    data,
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export async function updateStatus(id: string, status: string) {
  return prisma.supportQuery.update({ where: { id }, data: { status } });
}

// SLA policies
export async function listSlaPolicies() {
  return prisma.querySlaPolicy.findMany({ orderBy: { priority: 'asc' } });
}

export async function upsertSlaPolicy(priority: string, responseHours: number, resolutionHours: number) {
  return prisma.querySlaPolicy.upsert({
    where:  { priority },
    update: { responseHours, resolutionHours },
    create: { priority, responseHours, resolutionHours },
  });
}
