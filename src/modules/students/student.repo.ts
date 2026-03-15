import prisma from '@/lib/prisma';
import type { CreateStudentInput, StudentListParams } from './student.types';

export async function countStudents(where: Parameters<typeof prisma.student.count>[0]['where']) {
  return prisma.student.count({ where });
}

export async function findStudents(params: StudentListParams) {
  const where: Parameters<typeof prisma.student.findMany>[0]['where'] = {
    schoolId: params.schoolId,
    ...(params.status  && { status:  params.status }),
    ...(params.classId && { classId: params.classId }),
    ...(params.search  && {
      OR: [
        { firstName:   { contains: params.search, mode: 'insensitive' } },
        { lastName:    { contains: params.search, mode: 'insensitive' } },
        { admissionNo: { contains: params.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: {
        class: true,
        parentStudents: {
          include: {
            parent: {
              include: {
                user: { select: { firstName: true, lastName: true, phone: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.limit,
    }),
  ]);

  return { total, students };
}

export async function createStudent(data: CreateStudentInput) {
  return prisma.student.create({
    data: {
      schoolId:    data.schoolId,
      classId:     data.classId    || null,
      admissionNo: data.admissionNo,
      firstName:   data.firstName,
      lastName:    data.lastName,
      dateOfBirth: data.dob        ? new Date(data.dob) : null,
      gender:      data.gender     || null,
      address:     data.address    || null,
      bloodGroup:  data.bloodGroup || null,
      status:      'pending',
    },
  });
}

export async function updateStudentStatus(id: string, status: string) {
  return prisma.student.update({ where: { id }, data: { status } });
}
