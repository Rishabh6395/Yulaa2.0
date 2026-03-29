import bcrypt from 'bcryptjs';
import { AppError, ConflictError } from '@/utils/errors';
import * as repo from './super-admin.repo';
import type { CreateSchoolInput, UpdateSchoolInput, CreateUserInput } from './super-admin.types';

// ── Schools ──────────────────────────────────────────────────────────────────

export async function listSchools() {
  return { schools: await repo.findAllSchools() };
}

export async function createSchool(body: Record<string, any>) {
  const { name, email, phone, address, city, state, website, latitude, longitude, boardType, subscriptionPlan, configSource } = body;
  if (!name?.trim()) throw new AppError('School name is required');

  const school = await repo.createSchool({
    name, email: email || null, phone: phone || null, address: address || null,
    city: city || null, state: state || null, website: website || null,
    latitude:  latitude  ? parseFloat(latitude)  : null,
    longitude: longitude ? parseFloat(longitude) : null,
    boardType: boardType || null,
    subscriptionPlan,
  });
  return { school };
}

export async function updateSchool(body: Record<string, any>) {
  const { id, name, email, phone, address, city, state, website, latitude, longitude, boardType, subscriptionPlan, status } = body;
  if (!id) throw new AppError('id is required');

  return repo.updateSchool({
    id, name, email, phone, address, city, state, website,
    latitude:  latitude  !== undefined ? parseFloat(latitude)  : undefined,
    longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
    boardType, subscriptionPlan, status,
  } as UpdateSchoolInput);
}

export async function setDefaultSchool(id: string) {
  if (!id) throw new AppError('id is required');
  await repo.setDefaultSchool(id);
  return { success: true };
}

export async function getSchoolById(id: string) {
  const school = await repo.findSchoolById(id);
  if (!school) throw new AppError('School not found', 404);
  return { school };
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function listUsers() {
  return { users: await repo.findAllUsers() };
}

export async function listRoles() {
  return { roles: await repo.findAllRoles() };
}

export async function createUser(body: Record<string, any>) {
  const { firstName, lastName, email, phone, password, roleId, schoolId } = body as CreateUserInput;

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password || !roleId) {
    throw new AppError('firstName, lastName, email, password and roleId are required');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUser = await repo.createUserWithRole({ firstName, lastName, email, phone, password, passwordHash, roleId, schoolId: schoolId || null });

  // If the assigned role is 'teacher', also create the Teacher profile record
  const role = await repo.findRoleById(roleId);
  if (role?.code === 'teacher' && schoolId) {
    await repo.ensureTeacherRecord(newUser.id, schoolId);
  }

  return newUser;
}

export async function assignRole(body: Record<string, any>) {
  const { userId, roleId, schoolId } = body;
  if (!userId || !roleId) throw new AppError('userId and roleId are required');

  const existing = await repo.findExistingUserRole(userId, roleId, schoolId || null);
  if (existing)   throw new ConflictError('User already has this role');

  const userRole = await repo.addUserRole(userId, roleId, schoolId || null);

  // If the assigned role is 'teacher', also create the Teacher profile record
  const role = await repo.findRoleById(roleId);
  if (role?.code === 'teacher' && schoolId) {
    await repo.ensureTeacherRecord(userId, schoolId);
  }

  return userRole;
}

export async function removeRole(userId: string, roleId: string) {
  return repo.removeUserRole(userId, roleId);
}

export async function setUserStatus(userId: string, status: string) {
  return repo.updateUserStatus(userId, status);
}
