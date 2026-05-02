/**
 * Runs inside a Prisma transaction when an application is finally approved.
 * Creates: User (parent), Parent profile, Student(s), ParentStudent links, UserRoles, FeeInvoice(s).
 */
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

function admissionNo(schoolId: string): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ADM-${schoolId.slice(0, 4).toUpperCase()}-${year}-${rand}`;
}

function endOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export async function provisionApprovedApplication(applicationId: string) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.admissionApplication.findUniqueOrThrow({
      where:   { id: applicationId },
      include: { children: true, school: true },
    });

    // ── 1. Find or create parent User ──────────────────────────────────────
    // Prefer the logged-in user who submitted the application over email lookup
    let user = app.parentUserId
      ? await tx.user.findUnique({ where: { id: app.parentUserId } })
      : null;

    if (!user && app.parentEmail) {
      user = await tx.user.findUnique({ where: { email: app.parentEmail } });
    }

    if (!user) {
      const hash = await bcrypt.hash(app.parentPhone, 12);
      const [firstName, ...rest] = app.parentName.trim().split(' ');
      user = await tx.user.create({
        data: {
          email:             app.parentEmail || `parent-${app.id}@yulaa.app`,
          passwordHash:      hash,
          firstName:         firstName ?? app.parentName,
          lastName:          rest.join(' ') || '-',
          phone:             app.parentPhone,
          mustResetPassword: true,
          status:            'active',
        },
      });
    }

    // ── 2. Find or create Parent profile ───────────────────────────────────
    let parent = await tx.parent.findUnique({ where: { userId: user.id } });
    if (!parent) {
      parent = await tx.parent.create({ data: { userId: user.id } });
    }

    // ── 3. Assign parent role scoped to this school ────────────────────────
    const parentRole = await tx.role.findUnique({ where: { code: 'parent' } });
    if (parentRole) {
      const existingRole = await tx.userRole.findFirst({ where: { userId: user.id, roleId: parentRole.id, schoolId: app.schoolId } });
      if (!existingRole) {
        await tx.userRole.create({ data: { userId: user.id, roleId: parentRole.id, schoolId: app.schoolId, isPrimary: true } });
      }
    }

    // ── 4. For each child: create Student, ParentStudent, FeeInvoice ───────
    const studentRole = await tx.role.findUnique({ where: { code: 'student' } });

    for (const child of app.children) {
      // Resolve classId from classApplying label
      const cls = await tx.class.findFirst({
        where: { schoolId: app.schoolId, grade: { contains: child.classApplying, mode: 'insensitive' } },
      });

      const student = await tx.student.create({
        data: {
          schoolId:    app.schoolId,
          classId:     cls?.id ?? null,
          admissionNo: admissionNo(app.schoolId),
          firstName:   child.firstName,
          lastName:    child.lastName,
          dateOfBirth: child.dateOfBirth,
          gender:      child.gender,
          aadhaarNo:   child.aadhaarNo ?? null,
          status:      'active',
        },
      });

      // Link child record → student
      await tx.admissionChild.update({ where: { id: child.id }, data: { studentId: student.id } });

      // ParentStudent link
      await tx.parentStudent.create({
        data: { parentId: parent.id, studentId: student.id, relationship: 'parent', isPrimary: true },
      });

      // Optional student user account
      if (studentRole) {
        const studentUserEmail = `${student.admissionNo.toLowerCase()}@yulaa.student`;
        let sUser = await tx.user.findUnique({ where: { email: studentUserEmail } });
        if (!sUser) {
          const hash = await bcrypt.hash(student.admissionNo, 12);
          sUser = await tx.user.create({
            data: {
              email:             studentUserEmail,
              passwordHash:      hash,
              firstName:         student.firstName,
              lastName:          student.lastName,
              mustResetPassword: true,
              status:            'active',
            },
          });
        }
        const existingSR = await tx.userRole.findFirst({ where: { userId: sUser.id, roleId: studentRole.id, schoolId: app.schoolId } });
        if (!existingSR) {
          await tx.userRole.create({ data: { userId: sUser.id, roleId: studentRole.id, schoolId: app.schoolId, isPrimary: true } });
        }
      }

      // Admission fee invoice (placeholder amount from school config)
      const admissionFee = Number(app.school.admissionFeeAmt ?? 0);
      const invNo = `INV-ADM-${student.admissionNo}`;
      const exists = await tx.feeInvoice.findFirst({ where: { schoolId: app.schoolId, invoiceNo: invNo } });
      if (!exists) {
        await tx.feeInvoice.create({
          data: {
            schoolId:     app.schoolId,
            studentId:    student.id,
            invoiceNo:    invNo,
            amount:       admissionFee,
            dueDate:      endOfMonth(),
            status:       admissionFee > 0 ? 'unpaid' : 'paid',
            installmentNo: 1,
          },
        });
      }
    }

    // ── 5. Update application with parentUserId ────────────────────────────
    await tx.admissionApplication.update({ where: { id: applicationId }, data: { parentUserId: user.id } });

    if (process.env.NODE_ENV === 'development') console.log(`[NOTIFY] Application ${applicationId} approved — parent userId=${user.id}`);

    return { userId: user.id, parentId: parent.id };
  }, { timeout: 30000 });
}
