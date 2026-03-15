import prisma from '@/lib/prisma';
import type { CreateSchoolInput, UpdateSchoolInput, CreateUserInput } from './super-admin.types';

// ── Schools ──────────────────────────────────────────────────────────────────

export async function findAllSchools() {
  return prisma.school.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, phone: true, address: true,
      status: true, subscriptionPlan: true, createdAt: true,
      _count: { select: { students: true, teachers: true } },
    },
  });
}

export async function createSchool(data: CreateSchoolInput) {
  return prisma.school.create({
    data: {
      name:             data.name.trim(),
      email:            data.email   ?? null,
      phone:            data.phone   ?? null,
      address:          data.address ?? null,
      subscriptionPlan: data.subscriptionPlan || 'basic',
      status:           'active',
    },
  });
}

export async function updateSchool(data: UpdateSchoolInput) {
  return prisma.school.update({
    where: { id: data.id },
    data: {
      ...(data.name             && { name:             data.name.trim() }),
      ...(data.email   !== undefined && { email:            data.email   ?? null }),
      ...(data.phone   !== undefined && { phone:            data.phone   ?? null }),
      ...(data.address !== undefined && { address:          data.address ?? null }),
      ...(data.subscriptionPlan && { subscriptionPlan: data.subscriptionPlan }),
      ...(data.status           && { status:           data.status }),
    },
  });
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function findAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      phone: true, status: true, createdAt: true,
      userRoles: {
        include: {
          role:   true,
          school: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function findAllRoles() {
  return prisma.role.findMany({ orderBy: { displayName: 'asc' } });
}

export async function createUserWithRole(data: CreateUserInput & { passwordHash: string }) {
  return prisma.user.create({
    data: {
      firstName:    data.firstName.trim(),
      lastName:     data.lastName.trim(),
      email:        data.email.trim().toLowerCase(),
      phone:        data.phone || null,
      passwordHash: data.passwordHash,
      status:       'active',
      userRoles: {
        create: { roleId: data.roleId, schoolId: data.schoolId || null, isPrimary: true },
      },
    },
    select: {
      id: true, email: true, firstName: true, lastName: true, status: true,
      userRoles: { include: { role: true, school: { select: { id: true, name: true } } } },
    },
  });
}

export async function addUserRole(userId: string, roleId: string, schoolId: string | null) {
  return prisma.userRole.create({
    data:    { userId, roleId, schoolId, isPrimary: false },
    include: { role: true, school: { select: { id: true, name: true } } },
  });
}

export async function removeUserRole(userId: string, roleId: string) {
  return prisma.userRole.deleteMany({ where: { userId, roleId } });
}

export async function updateUserStatus(userId: string, status: string) {
  return prisma.user.update({ where: { id: userId }, data: { status }, select: { id: true, status: true } });
}

export async function findExistingUserRole(userId: string, roleId: string, schoolId: string | null) {
  return prisma.userRole.findFirst({ where: { userId, roleId, schoolId } });
}
