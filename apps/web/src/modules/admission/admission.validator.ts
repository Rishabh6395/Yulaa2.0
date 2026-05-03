import prisma from '@/lib/prisma';
import type { CreateChildInput, ValidationFlag, ValidationResult } from './admission.types';

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

/** Load school's configured grade names (from GradeMaster) for age-check gating. */
async function getSchoolGradeNames(schoolId: string): Promise<Set<string>> {
  const grades = await prisma.gradeMaster.findMany({
    where: { schoolId, isActive: true },
    select: { name: true },
  });
  return new Set(grades.map(g => g.name.toLowerCase().trim()));
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

  // Load the school's configured grade names — age check only runs for known grades
  const schoolGrades = await getSchoolGradeNames(schoolId);
  const gradeCheckEnabled = schoolGrades.size > 0;

  for (let i = 0; i < children.length; i++) {
    const child  = children[i];
    const dob    = child.dateOfBirth ? new Date(child.dateOfBirth) : null;
    const dobValid = dob instanceof Date && !isNaN(dob.getTime());

    // Aadhaar format
    if (child.aadhaarNo && !validateAadhaar(child.aadhaarNo)) {
      flags.push({ code: 'AADHAAR_INVALID', severity: 'error', message: `Invalid Aadhaar number (must be 12 digits)`, childIndex: i });
    }

    // Age-class consistency: only warn when school has configured grades AND the
    // applied grade is not found in the school's GradeMaster (unknown grade = no check)
    if (dobValid && gradeCheckEnabled) {
      const gradeNorm = child.classApplying?.toLowerCase().trim() ?? '';
      if (!schoolGrades.has(gradeNorm)) {
        const age = ageInYears(dob!);
        flags.push({
          code: 'AGE_MISMATCH', severity: 'warning',
          message: `Grade "${child.classApplying}" is not in the school's configured grade list (age ${age})`,
          childIndex: i,
        });
      }
    }

    // Duplicate Aadhaar
    if (child.aadhaarNo && validateAadhaar(child.aadhaarNo)) {
      const dup = await hasDuplicateAadhaar(child.aadhaarNo, schoolId);
      if (dup) flags.push({ code: 'DUPLICATE_AADHAAR', severity: 'error', message: `Aadhaar ${child.aadhaarNo} already exists in this school`, childIndex: i });
    }

    // Duplicate name + DOB (only when DOB is valid)
    if (dobValid) {
      const nameDup = await hasDuplicateNameDob(child.firstName, child.lastName, dob!, schoolId);
      if (nameDup) flags.push({ code: 'DUPLICATE_NAME_DOB', severity: 'warning', message: `A student with the same name and date of birth already exists`, childIndex: i });
    }
  }

  const riskScore = Math.min(100, flags.reduce((acc, f) => acc + (f.severity === 'error' ? 30 : 10), 0));
  return { flags, riskScore };
}
