import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { CreateStudentInput, StudentListParams } from './student.types';

export async function countStudents(where: Prisma.StudentWhereInput) {
  return prisma.student.count({ where });
}

export async function findStudents(params: StudentListParams) {
  const where: Prisma.StudentWhereInput = {
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
      schoolId:          data.schoolId,
      classId:           data.classId           || null,
      admissionNo:       data.admissionNo,
      firstName:         data.firstName,
      lastName:          data.lastName,
      dateOfBirth:       data.dob               ? new Date(data.dob) : null,
      gender:            data.gender             || null,
      address:           data.address            || null,
      bloodGroup:        data.bloodGroup         || null,
      photoUrl:          data.photoUrl           || null,
      status:            'pending',
      // Extended fields (nullable — safe if DB columns don't exist yet)
      middleName:        data.middleName         || null,
      rollNo:            data.rollNo             || null,
      srNo:              data.srNo               || null,
      aadhaarNo:         data.aadhaarNo          || null,
      nationality:       data.nationality        || null,
      motherTongue:      data.motherTongue       || null,
      category:          data.category           || null,
      religion:          data.religion           || null,
      houseId:           data.houseId            || null,
      stream:            data.stream             || null,
      admissionCategory: data.admissionCategory  || null,
      boardingType:      data.boardingType       || null,
      dietType:          data.dietType           || null,
      disabilityType:    data.disabilityType     || null,
      transportRouteId:  data.transportRouteId   || null,
      busStop:           data.busStop            || null,
      doctorName:        data.doctorName         || null,
      doctorPhone:       data.doctorPhone        || null,
      insuranceProvider: data.insuranceProvider  || null,
      passportNo:        data.passportNo         || null,
    },
  });
}

export async function updateStudentStatus(id: string, status: string) {
  return prisma.student.update({ where: { id }, data: { status } });
}
