import { CORE_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';
import bcrypt from 'bcryptjs';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';


function assertAdmin(user: any) {
  if (!user) throw new UnauthorizedError();
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
  return primary;
}

// ── GET: list all parents in school ──────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const user    = await getUserFromRequest(request);
    const primary = assertAdmin(user!);
    const schoolId = primary.school_id ?? new URL(request.url).searchParams.get('school_id');
    if (!schoolId) throw new AppError('school_id is required for super_admin', 400);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit  = parseInt(searchParams.get('limit') ?? '20', 10);

    // Parents who have a role in this school
    const where = {
      user: {
        userRoles: { some: { schoolId, role: { code: 'parent' } } },
        ...(search ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName:  { contains: search, mode: 'insensitive' as const } },
            { email:     { contains: search, mode: 'insensitive' as const } },
            { phone:     { contains: search, mode: 'insensitive' as const } },
          ],
        } : {}),
      },
    };

    const [total, parents] = await Promise.all([
      prisma.parent.count({ where }),
      prisma.parent.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true } },
          parentStudents: {
            include: {
              student: {
                select: { id: true, firstName: true, lastName: true, admissionNo: true, classId: true, class: { select: { grade: true, section: true } } },
              },
            },
          },
        },
        orderBy: { user: { firstName: 'asc' } },
        skip:  (page - 1) * limit,
        take:  limit,
      }),
    ]);

    const rows = parents.map((p) => ({
      id:         p.id,
      user_id:    p.user.id,
      first_name: p.user.firstName,
      last_name:  p.user.lastName,
      email:      p.user.email,
      phone:      p.user.phone,
      status:     p.user.status,
      children:   p.parentStudents.map((ps) => ({
        id:           ps.student.id,
        first_name:   ps.student.firstName,
        last_name:    ps.student.lastName,
        admission_no: ps.student.admissionNo,
        grade:        ps.student.class?.grade   ?? null,
        section:      ps.student.class?.section ?? null,
      })),
    }));

    return Response.json({ parents: rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) { return handleError(err); }
}

// ── POST: create parent (+ optional child link) ───────────────────────────────

export async function POST(request: Request) {
  try {
    const user    = await getUserFromRequest(request);
    const primary = assertAdmin(user!);
    const schoolId = primary.school_id ?? (await request.clone().json()).school_id;
    if (!schoolId) throw new AppError('school_id is required', 400);

    const { first_name, last_name, email, phone, password, student_ids } = await request.json();
    if (!first_name || !phone) throw new AppError('first_name and phone are required', 400);

    const resolvedEmail = email?.trim() || `${phone.replace(/\s+/g, '')}.${schoolId.slice(0, 6)}@noemail.local`;
    const resolvedPass  = password || phone;

    // find-or-create User
    let userRec = await prisma.user.findUnique({ where: { email: resolvedEmail } });
    if (!userRec) {
      const hash = await bcrypt.hash(resolvedPass, 12);
      userRec = await prisma.user.create({
        data: {
          firstName:         first_name.trim(),
          lastName:          (last_name?.trim()) || '-',
          email:             resolvedEmail,
          phone:             phone.trim(),
          passwordHash:      hash,
          mustResetPassword: !password, // if auto-generated pwd, force reset
          status:            'active',
        },
      });
    }

    // find-or-create Parent profile
    let parent = await prisma.parent.findUnique({ where: { userId: userRec.id } });
    if (!parent) {
      parent = await prisma.parent.create({ data: { userId: userRec.id } });
    }

    // assign parent role to this school
    const parentRole = await prisma.role.findUnique({ where: { code: 'parent' } });
    if (parentRole) {
      const exists = await prisma.userRole.findFirst({ where: { userId: userRec.id, roleId: parentRole.id, schoolId } });
      if (!exists) {
        await prisma.userRole.create({ data: { userId: userRec.id, roleId: parentRole.id, schoolId, isPrimary: true } });
      }
    }

    // link students
    if (Array.isArray(student_ids) && student_ids.length > 0) {
      for (const studentId of student_ids) {
        const alreadyLinked = await prisma.parentStudent.findFirst({ where: { parentId: parent.id, studentId } });
        if (!alreadyLinked) {
          await prisma.parentStudent.create({ data: { parentId: parent.id, studentId } });
        }
      }
    }

    return Response.json({ parent: { id: parent.id, user_id: userRec.id, first_name: userRec.firstName, last_name: userRec.lastName, email: userRec.email, phone: userRec.phone } }, { status: 201 });
  } catch (err) { return handleError(err); }
}

// ── PATCH: link/unlink child ──────────────────────────────────────────────────

export async function PATCH(request: Request) {
  try {
    const user    = await getUserFromRequest(request);
    assertAdmin(user!);
    const { action, parent_id, student_id } = await request.json();

    if (!parent_id || !student_id) throw new AppError('parent_id and student_id are required', 400);

    if (action === 'unlink') {
      await prisma.parentStudent.deleteMany({ where: { parentId: parent_id, studentId: student_id } });
      return Response.json({ ok: true });
    }

    // default: link
    const exists = await prisma.parentStudent.findFirst({ where: { parentId: parent_id, studentId: student_id } });
    if (!exists) {
      await prisma.parentStudent.create({ data: { parentId: parent_id, studentId: student_id } });
    }
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
