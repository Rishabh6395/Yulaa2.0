/**
 * GET    /api/library/issues?school_id=X&student_id=X&status=X   — list issues
 * POST   /api/library/issues                                       — issue a book
 * PATCH  /api/library/issues?id=X                                 — return / mark overdue / lost
 *
 * Default loan period: 14 days. Fine on overdue: configurable (default ₹1/day).
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const LOAN_DAYS    = 14;
const FINE_PER_DAY = 1;  // ₹ per day

async function resolveSchoolId(user: any, override?: string | null): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId  = await resolveSchoolId(user, searchParams.get('school_id'));
    const studentId = searchParams.get('student_id');
    const teacherId = searchParams.get('teacher_id');
    const status    = searchParams.get('status');
    const overdue   = searchParams.get('overdue') === 'true';
    const today     = new Date();

    const issues = await prisma.libraryIssue.findMany({
      where: {
        schoolId,
        ...(studentId ? { studentId }            : {}),
        ...(teacherId ? { teacherId }             : {}),
        ...(status    ? { status }                : {}),
        ...(overdue   ? { dueDate: { lt: today }, status: 'issued' } : {}),
      },
      include: {
        book:    { select: { id: true, title: true, author: true, isbn: true } },
        student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
        teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { issueDate: 'desc' },
    });

    return Response.json({ issues });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal', 'librarian', 'teacher'].includes(primary.role_code))
      throw new ForbiddenError();

    const body = await request.json();
    const { schoolId: sid, bookId, studentId, teacherId, loanDays } = body;
    const schoolId = await resolveSchoolId(user, sid);

    if (!bookId || (!studentId && !teacherId))
      throw new AppError('bookId and (studentId or teacherId) required');

    const book = await prisma.libraryBook.findFirst({ where: { id: bookId, schoolId, isActive: true } });
    if (!book) throw new AppError('Book not found', 404);
    if (book.availableCopies < 1) throw new AppError('No copies available', 409);

    // Check borrower has no overdue books
    const borrowerFilter = studentId ? { studentId } : { teacherId };
    const overdueCount = await prisma.libraryIssue.count({
      where: { schoolId, ...borrowerFilter, status: { in: ['issued', 'overdue'] } },
    });
    if (overdueCount >= 3) throw new AppError('Borrower has reached the maximum active issues limit (3)', 409);

    const issueDate = new Date();
    const dueDate   = new Date();
    dueDate.setDate(dueDate.getDate() + (loanDays ?? LOAN_DAYS));

    const [issue] = await prisma.$transaction([
      prisma.libraryIssue.create({
        data: {
          schoolId, bookId,
          studentId: studentId ?? null,
          teacherId: teacherId ?? null,
          issueDate, dueDate,
          status:    'issued',
          issuedById: user.id,
        },
      }),
      // Atomic: only decrements if availableCopies > 0 — prevents going negative under concurrent requests
      prisma.libraryBook.update({
        where: { id: bookId, availableCopies: { gt: 0 } },
        data:  { availableCopies: { decrement: 1 } },
      }),
    ]);

    return Response.json({ issue }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal', 'librarian', 'teacher'].includes(primary.role_code))
      throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const issue = await prisma.libraryIssue.findUnique({ where: { id } });
    if (!issue) throw new AppError('Issue not found', 404);
    if (primary.school_id && issue.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    const { action } = body;

    if (action === 'return') {
      if (issue.status === 'returned') throw new AppError('Already returned');
      const returnDate = new Date();
      const dueDate    = new Date(issue.dueDate);
      let fine = 0;
      if (returnDate > dueDate) {
        const days = Math.ceil((returnDate.getTime() - dueDate.getTime()) / 86400000);
        fine = days * (body.finePerDay ?? FINE_PER_DAY);
      }

      const [updated] = await prisma.$transaction([
        prisma.libraryIssue.update({
          where: { id },
          data:  { status: 'returned', returnDate, fine: fine > 0 ? fine : null },
        }),
        prisma.libraryBook.update({
          where: { id: issue.bookId },
          data:  { availableCopies: { increment: 1 } },
        }),
      ]);
      return Response.json({ issue: updated, fine });
    }

    if (action === 'lost') {
      const [updated] = await prisma.$transaction([
        prisma.libraryIssue.update({
          where: { id },
          data:  { status: 'lost', remarks: body.remarks ?? null },
        }),
        // Don't return copy to available since it's lost
      ]);
      return Response.json({ issue: updated });
    }

    if (action === 'mark_overdue') {
      const updated = await prisma.libraryIssue.update({
        where: { id },
        data:  { status: 'overdue' },
      });
      return Response.json({ issue: updated });
    }

    throw new AppError('action must be return | lost | mark_overdue');
  } catch (err) { return handleError(err); }
}
