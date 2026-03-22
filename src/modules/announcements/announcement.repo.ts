import prisma from '@/lib/prisma';

const AUTO_EXPIRE_DAYS = 20;

export async function findAnnouncements(schoolId: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AUTO_EXPIRE_DAYS);
  return prisma.announcement.findMany({
    where: {
      schoolId,
      createdAt: { gte: cutoff },           // auto-hide if older than 20 days
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },  // also respect manual expiresAt
      ],
    },
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
