import prisma from '@/lib/prisma';
import type { CreateSchoolInput, UpdateSchoolInput, CreateUserInput } from './super-admin.types';

// ── Schools ──────────────────────────────────────────────────────────────────

export async function findAllSchools() {
  return prisma.school.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true, name: true, email: true, phone: true, address: true,
      city: true, state: true, website: true,
      status: true, subscriptionPlan: true, isDefault: true,
      latitude: true, longitude: true, boardType: true, createdAt: true,
      _count: { select: { students: true, teachers: true } },
    },
  });
}

export async function findSchoolById(id: string) {
  return prisma.school.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, address: true,
      city: true, state: true, website: true, description: true,
      status: true, subscriptionPlan: true, isDefault: true,
      latitude: true, longitude: true, boardType: true, createdAt: true,
      _count: { select: { students: true, teachers: true, classes: true } },
    },
  });
}

export async function findDefaultSchool() {
  return prisma.school.findFirst({ where: { isDefault: true } });
}

export async function setDefaultSchool(id: string) {
  // Clear existing default, then set new one
  await prisma.school.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  return prisma.school.update({ where: { id }, data: { isDefault: true } });
}

export async function createSchool(data: CreateSchoolInput) {
  return prisma.school.create({
    data: {
      name:             data.name.trim(),
      email:            data.email     ?? null,
      phone:            data.phone     ?? null,
      address:          data.address   ?? null,
      city:             data.city      ?? null,
      state:            data.state     ?? null,
      website:          data.website   ?? null,
      latitude:         data.latitude  ?? null,
      longitude:        data.longitude ?? null,
      boardType:        data.boardType ?? null,
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
      ...(data.email   !== undefined && { email:    data.email   ?? null }),
      ...(data.phone   !== undefined && { phone:    data.phone   ?? null }),
      ...(data.address !== undefined && { address:  data.address ?? null }),
      ...(data.city    !== undefined && { city:     data.city    ?? null }),
      ...(data.state   !== undefined && { state:    data.state   ?? null }),
      ...(data.website !== undefined && { website:  data.website ?? null }),
      ...(data.latitude  !== undefined && { latitude:  data.latitude  }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.boardType !== undefined && { boardType: data.boardType ?? null }),
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
