import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AppError, ConflictError } from '@/utils/errors';
import * as repo from './super-admin.repo';
import type { CreateSchoolInput, UpdateSchoolInput, CreateUserInput } from './super-admin.types';

// ── Schools ──────────────────────────────────────────────────────────────────

export async function listSchools() {
  return { schools: await repo.findAllSchools() };
}

export async function createSchool(body: Record<string, any>) {
  const { name, email, phone, address, city, state, district, website, latitude, longitude, boardType, subscriptionPlan } = body;
  if (!name?.trim()) throw new AppError('School name is required');

  // Compose city value: prefer district from master, fallback to city text
  const cityValue = district?.trim() || city?.trim() || null;

  const school = await repo.createSchool({
    name, email: email || null, phone: phone || null, address: address || null,
    city: cityValue, state: state || null, website: website || null,
    latitude:  latitude  ? parseFloat(latitude)  : null,
    longitude: longitude ? parseFloat(longitude) : null,
    boardType: boardType || null,
    subscriptionPlan,
  });

  // Auto-sync form config + content types from default school (Super Admin template)
  try { await syncFormConfigToSchool(school.id); } catch { /* non-fatal */ }

  // Auto-create school admin user from the provided email
  let adminUser: { email: string; tempPassword: string; isNew: boolean } | null = null;
  if (email?.trim()) {
    try { adminUser = await createSchoolAdminFromEmail(email.trim(), school.id); } catch { /* non-fatal */ }
  }

  return { school, adminUser };
}

async function createSchoolAdminFromEmail(email: string, schoolId: string) {
  const schoolAdminRole = await repo.findRoleByCode('school_admin');
  if (!schoolAdminRole) return null;

  const existing = await repo.findUserByEmail(email);

  if (existing) {
    // User exists — just assign school_admin role for this school if not already assigned
    const alreadyAssigned = await repo.findExistingUserRole(existing.id, schoolAdminRole.id, schoolId);
    if (!alreadyAssigned) {
      await repo.addUserRole(existing.id, schoolAdminRole.id, schoolId);
    }
    return { email: existing.email, tempPassword: '', isNew: false };
  }

  // Create new user with a temporary password
  const tempPassword  = crypto.randomBytes(6).toString('base64url'); // ~8 chars, URL-safe
  const passwordHash  = await bcrypt.hash(tempPassword, 12);
  const nameParts     = email.split('@')[0].split('.');
  const firstName     = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'School';
  const lastName      = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 'Admin';

  await repo.createUserWithRole({
    firstName,
    lastName,
    email,
    phone: null,
    password: tempPassword,
    passwordHash,
    roleId: schoolAdminRole.id,
    schoolId,
  });

  return { email, tempPassword, isNew: true };
}

export async function syncFormConfigToSchool(targetSchoolId: string) {
  const defaultSchool = await repo.findDefaultSchool();
  if (!defaultSchool || defaultSchool.id === targetSchoolId) return { synced: 0, contentTypesSynced: 0 };

  const [formConfigs, contentTypes] = await Promise.all([
    repo.findFormConfigsBySchool(defaultSchool.id),
    repo.findContentTypesBySchool(defaultSchool.id),
  ]);

  const [syncedConfigs, syncedTypes] = await Promise.all([
    repo.bulkUpsertFormConfigs(
      targetSchoolId,
      formConfigs.map(c => ({ formId: c.formId, role: c.role, fieldRules: c.fieldRules })),
    ),
    repo.bulkCreateContentTypes(
      targetSchoolId,
      contentTypes.map(ct => ({
        formName:  ct.formName,
        fieldSlot: ct.fieldSlot,
        fieldType: ct.fieldType,
        label:     ct.label,
        options:   ct.options,
        sortOrder: ct.sortOrder,
      })),
    ),
  ]);

  return { synced: syncedConfigs.length, contentTypesSynced: syncedTypes.length };
}

export async function updateSchool(body: Record<string, any>) {
  const { id, name, email, phone, address, city, state, district, website, latitude, longitude, boardType, subscriptionPlan, status } = body;
  if (!id) throw new AppError('id is required');

  const cityValue = district?.trim() || city?.trim() || undefined;

  return repo.updateSchool({
    id, name, email, phone, address,
    city: cityValue !== undefined ? cityValue : city,
    state, website,
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
