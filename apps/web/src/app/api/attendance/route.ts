import { getUserFromRequest } from '@/lib/auth';
import { getAttendance, markAttendance } from '@/modules/attendance/attendance.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import { assertParentOwnsStudent, getStudentSchoolId, isTeacherAssignedToClass } from '@/lib/school-utils';
import prisma from '@/lib/prisma';

// Roles that can mark attendance (students and parents cannot — G-003)
const MARK_ROLES = ['school_admin', 'principal', 'hod', 'teacher', 'employee'];

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primaryRole;
    const { searchParams } = new URL(request.url);

    // ── Student: can ONLY see their own attendance (G-002) ─────────────────
    if (role === 'student') {
      if (!schoolId) throw new ForbiddenError('No school associated with your account');
      // Look up the student record linked to this user account.
      // Student.userId is set by the admission provisioner.
      const ownStudent = await prisma.student.findFirst({
        where:  { userId: user.id, schoolId },
        select: { id: true },
      });
      if (!ownStudent) return Response.json({ attendance: [] });

      // Force student_id to only their own record — prevents IDOR enumeration.
      const scoped = new URLSearchParams(searchParams);
      scoped.set('student_id', ownStudent.id);
      return Response.json(await getAttendance(schoolId, scoped));
    }

    // ── Parent: assertParentOwnsStudent for EVERY request (G-002) ──────────
    // Previously this check was inside `if (!schoolId)` which was never entered
    // because all parents have a schoolId in their UserRole — making the check dead code.
    if (role === 'parent') {
      const studentId = searchParams.get('student_id');
      if (!studentId) return Response.json({ attendance: [] });
      await assertParentOwnsStudent(user.id, studentId);
      // Resolve school from the student record — more reliable than the parent's JWT school.
      const resolvedSchoolId = await getStudentSchoolId(studentId);
      return Response.json(await getAttendance(resolvedSchoolId, searchParams));
    }

    // ── Staff / admin: full school access ──────────────────────────────────
    if (!schoolId) throw new ForbiddenError('No school associated with your account');
    return Response.json(await getAttendance(schoolId, searchParams));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primaryRole;

    // Students and parents must never be able to mark attendance (G-003).
    if (!MARK_ROLES.includes(role)) {
      throw new ForbiddenError('You do not have permission to mark attendance');
    }
    if (!schoolId) throw new ForbiddenError('No school associated with your account');

    const body = await request.json();

    // For student attendance records, teachers must own the target class (G-003).
    // Admin roles (school_admin, principal, hod) can mark for any class.
    if (!body.type && body.class_id && role === 'teacher') {
      const assigned = await isTeacherAssignedToClass(user.id, schoolId, body.class_id);
      if (!assigned) {
        throw new ForbiddenError('You are not assigned to this class');
      }
    }

    return Response.json(await markAttendance(schoolId, user.id, body));
  } catch (err) { return handleError(err); }
}
