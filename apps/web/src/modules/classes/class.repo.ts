import prisma from '@/lib/prisma';
import { currentAcademicYearLabel } from '@/lib/school-utils';
import type { CreateClassInput, UpdateClassInput } from './class.types';

export async function findClassesBySchool(schoolId: string) {
  return prisma.class.findMany({
    where: { schoolId },
    include: {
      classTeacher: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
      _count: { select: { students: { where: { status: 'active' } } } },
    },
    orderBy: [{ grade: 'asc' }, { section: 'asc' }],
  });
}

export async function createClass(data: CreateClassInput) {
  return prisma.class.create({
    data: {
      schoolId:        data.schoolId,
      name:            data.name            || `${data.grade}-${data.section}`,
      grade:           data.grade,
      section:         data.section,
      classTeacherId:  data.classTeacherId  || null,
      academicYear:    data.academicYear    || currentAcademicYearLabel(),
      maxStudents:     data.maxStudents     || 40,
    },
  });
}

export async function updateClass(data: UpdateClassInput) {
  return prisma.class.update({
    where: { id: data.id, schoolId: data.schoolId },
    data: {
      ...(data.grade           && { grade:          data.grade }),
      ...(data.section         && { section:        data.section }),
      ...(data.name            && { name:           data.name }),
      ...(data.classTeacherId !== undefined && { classTeacherId: data.classTeacherId || null }),
      ...(data.academicYear    && { academicYear:   data.academicYear }),
      ...(data.maxStudents     && { maxStudents:    data.maxStudents }),
    },
  });
}
