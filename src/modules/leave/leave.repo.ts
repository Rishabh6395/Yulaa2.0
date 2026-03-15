import prisma from '@/lib/prisma';

export async function findLeaveRequests(schoolId: string, userId?: string) {
  return prisma.leaveRequest.findMany({
    where: { schoolId, ...(userId && { userId }) },
    include: {
      user:           { select: { firstName: true, lastName: true } },
      reviewedByUser: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function createLeaveRequest(data: {
  schoolId:  string;
  userId:    string;
  roleCode:  string;
  startDate: Date;
  endDate:   Date;
  reason:    string;
}) {
  return prisma.leaveRequest.create({ data });
}

export async function reviewLeaveRequest(id: string, status: string, reviewedBy: string) {
  return prisma.leaveRequest.update({
    where: { id },
    data:  { status, reviewedBy, reviewedAt: new Date() },
  });
}
