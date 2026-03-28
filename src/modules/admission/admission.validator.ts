import prisma from '@/lib/prisma';
import type { CreateChildInput, ValidationFlag, ValidationResult } from './admission.types';

/** Expected age range [min, max] for each grade label keyword */
const GRADE_AGE_MAP: Record<string, [number, number]> = {
  nursery: [3, 5], kg: [4, 6], 'lkg': [4, 6], 'ukg': [5, 7],
  '1': [5, 8],  '2': [6, 9],  '3': [7, 10], '4': [8, 11], '5': [9, 12],
  '6': [10, 13], '7': [11, 14], '8': [12, 15], '9': [13, 16],
  '10': [14, 17], '11': [15, 18], '12': [16, 19],
};

function ageInYears(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  ) age--;
  return age;
}

function validateAadhaar(no: string): boolean {
  return /^\d{12}$/.test(no);
}

function gradeKey(classApplying: string): string {
  if (!classApplying) return '';
  const lower = classApplying.toLowerCase().replace(/grade\s*/i, '').trim();
  return lower;
}

function checkAgeForClass(dob: Date, classApplying: string): boolean {
  const key   = gradeKey(classApplying);
  const range = GRADE_AGE_MAP[key];
  if (!range) return true; // unknown grade — skip check
  const age = ageInYears(dob);
  return age >= range[0] && age <= range[1];
}

async function hasDuplicateAadhaar(aadhaarNo: string, schoolId: string): Promise<boolean> {
  const count = await prisma.student.count({ where: { schoolId, aadhaarNo } });
  const appCount = await prisma.admissionChild.count({
    where: { aadhaarNo, application: { schoolId, status: { not: 'rejected' } } },
  });
  return count > 0 || appCount > 0;
}

async function hasDuplicateNameDob(firstName: string, lastName: string, dob: Date, schoolId: string): Promise<boolean> {
  const count = await prisma.student.count({
    where: { schoolId, firstName: { equals: firstName, mode: 'insensitive' }, lastName: { equals: lastName, mode: 'insensitive' }, dateOfBirth: dob },
  });
  return count > 0;
}

export async function runValidation(children: CreateChildInput[], schoolId: string): Promise<ValidationResult> {
  const flags: ValidationFlag[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const dob   = new Date(child.dateOfBirth);

    // Aadhaar format
    if (child.aadhaarNo && !validateAadhaar(child.aadhaarNo)) {
      flags.push({ code: 'AADHAAR_INVALID', severity: 'error', message: `Invalid Aadhaar number (must be 12 digits)`, childIndex: i });
    }

    // Age-class consistency
    if (!checkAgeForClass(dob, child.classApplying)) {
      const age = ageInYears(dob);
      flags.push({ code: 'AGE_MISMATCH', severity: 'warning', message: `Age ${age} seems unusual for ${child.classApplying}`, childIndex: i });
    }

    // Duplicate Aadhaar
    if (child.aadhaarNo && validateAadhaar(child.aadhaarNo)) {
      const dup = await hasDuplicateAadhaar(child.aadhaarNo, schoolId);
      if (dup) flags.push({ code: 'DUPLICATE_AADHAAR', severity: 'error', message: `Aadhaar ${child.aadhaarNo} already exists in this school`, childIndex: i });
    }

    // Duplicate name + DOB
    const nameDup = await hasDuplicateNameDob(child.firstName, child.lastName, dob, schoolId);
    if (nameDup) flags.push({ code: 'DUPLICATE_NAME_DOB', severity: 'warning', message: `A student with the same name and date of birth already exists`, childIndex: i });
  }

  const riskScore = Math.min(100, flags.reduce((acc, f) => acc + (f.severity === 'error' ? 30 : 10), 0));
  return { flags, riskScore };
}
