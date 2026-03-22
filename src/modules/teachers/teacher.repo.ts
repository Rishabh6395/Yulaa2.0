import prisma from '@/lib/prisma';
import type { CreateTeacherInput } from './teacher.types';

export async function findTeachersBySchool(schoolId: string) {
  return prisma.teacher.findMany({
    where: { schoolId },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
      },
    },
    orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
  });
}

export async function findTeacherRole() {
  return prisma.role.findUnique({ where: { code: 'teacher' } });
}

export async function updateTeacherStatus(teacherId: string, status: string) {
  return prisma.teacher.update({ where: { id: teacherId }, data: { status } });
}

export async function createTeacherWithUser(data: CreateTeacherInput & { passwordHash: string; roleId: string }) {
  return prisma.user.create({
    data: {
      email:        data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      firstName:    data.firstName,
      lastName:     data.lastName,
      phone:        data.phone || null,
      userRoles: {
        create: { roleId: data.roleId, schoolId: data.schoolId, isPrimary: true },
      },
      teachers: {
        create: {
          schoolId:      data.schoolId,
          employeeId:    data.employeeId    || null,
          qualification: data.qualification || null,
          joiningDate:   data.joiningDate   ? new Date(data.joiningDate) : null,
        },
      },
    },
    include: { teachers: true },
  });
}
