import prisma from '@/lib/prisma';

export async function findParentByUserId(userId: string) {
  return prisma.parent.findUnique({ where: { userId } });
}

export async function findChildrenByParentId(parentId: string) {
  return prisma.parentStudent.findMany({
    where: { parentId },
    include: { student: { include: { school: true, class: true } } },
    orderBy: [{ isPrimary: 'desc' }, { student: { firstName: 'asc' } }],
  });
}
