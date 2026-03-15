import prisma from '@/lib/prisma';

export async function findAnnouncements(schoolId: string) {
  return prisma.announcement.findMany({
    where: { schoolId },
    include: { createdByUser: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function createAnnouncement(data: {
  schoolId:    string;
  title:       string;
  content:     string;
  targetRoles: string[];
  priority:    string;
  expiresAt:   Date | null;
  createdBy:   string;
}) {
  return prisma.announcement.create({ data });
}
