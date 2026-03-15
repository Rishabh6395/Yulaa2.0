import bcrypt from 'bcryptjs';
import { AppError, ConflictError } from '@/utils/errors';
import * as repo from './super-admin.repo';
import type { CreateSchoolInput, UpdateSchoolInput, CreateUserInput } from './super-admin.types';

// ── Schools ──────────────────────────────────────────────────────────────────

export async function listSchools() {
  return { schools: await repo.findAllSchools() };
}

export async function createSchool(body: Record<string, any>) {
  const { name, email, phone, address, subscriptionPlan } = body;
  if (!name?.trim()) throw new AppError('School name is required');

  return repo.createSchool({ name, email: email || null, phone: phone || null, address: address || null, subscriptionPlan });
}

export async function updateSchool(body: Record<string, any>) {
  const { id, name, email, phone, address, subscriptionPlan, status } = body;
  if (!id) throw new AppError('id is required');

  return repo.updateSchool({ id, name, email, phone, address, subscriptionPlan, status } as UpdateSchoolInput);
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
  return repo.createUserWithRole({ firstName, lastName, email, phone, password, passwordHash, roleId, schoolId: schoolId || null });
}

export async function assignRole(body: Record<string, any>) {
  const { userId, roleId, schoolId } = body;
  if (!userId || !roleId) throw new AppError('userId and roleId are required');

  const existing = await repo.findExistingUserRole(userId, roleId, schoolId || null);
  if (existing)   throw new ConflictError('User already has this role');

  return repo.addUserRole(userId, roleId, schoolId || null);
}

export async function removeRole(userId: string, roleId: string) {
  return repo.removeUserRole(userId, roleId);
}

export async function setUserStatus(userId: string, status: string) {
  return repo.updateUserStatus(userId, status);
}
