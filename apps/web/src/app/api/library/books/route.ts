/**
 * GET    /api/library/books?school_id=X&subject=X&search=X   — catalog search
 * POST   /api/library/books                                   — add book
 * PATCH  /api/library/books?id=X                              — update book
 * DELETE /api/library/books?id=X                              — remove (if no active issues)
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

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
    const schoolId = await resolveSchoolId(user, searchParams.get('school_id'));
    const subject  = searchParams.get('subject');
    const search   = searchParams.get('search');
    const genre    = searchParams.get('genre');
    const available = searchParams.get('available') === 'true';

    const books = await prisma.libraryBook.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(subject ? { subject } : {}),
        ...(genre   ? { genre }   : {}),
        ...(available ? { availableCopies: { gt: 0 } } : {}),
        ...(search ? {
          OR: [
            { title:  { contains: search, mode: 'insensitive' } },
            { author: { contains: search, mode: 'insensitive' } },
            { isbn:   { contains: search } },
          ],
        } : {}),
      },
      include: { _count: { select: { issues: { where: { status: 'issued' } } } } },
      orderBy: { title: 'asc' },
    });

    return Response.json({ books });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal', 'librarian'].includes(primary.role_code))
      throw new ForbiddenError('Admin or librarian role required');

    const body = await request.json();
    const { schoolId: sid, title, author, isbn, publisher, genre, subject, language, totalCopies, location, coverUrl } = body;
    const schoolId = await resolveSchoolId(user, sid);
    if (!title) throw new AppError('title required');

    const book = await prisma.libraryBook.create({
      data: {
        schoolId, title,
        author:      author      ?? null,
        isbn:        isbn        ?? null,
        publisher:   publisher   ?? null,
        genre:       genre       ?? null,
        subject:     subject     ?? null,
        language:    language    ?? 'English',
        totalCopies: totalCopies ?? 1,
        availableCopies: totalCopies ?? 1,
        location:    location    ?? null,
        coverUrl:    coverUrl    ?? null,
        createdById: user.id,
      },
    });

    return Response.json({ book }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal', 'librarian'].includes(primary.role_code))
      throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const book = await prisma.libraryBook.findUnique({ where: { id } });
    if (!book) throw new AppError('Book not found', 404);
    if (primary.school_id && book.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    const updated = await prisma.libraryBook.update({
      where: { id },
      data: {
        ...(body.title       !== undefined ? { title: body.title }             : {}),
        ...(body.author      !== undefined ? { author: body.author }           : {}),
        ...(body.isbn        !== undefined ? { isbn: body.isbn }               : {}),
        ...(body.publisher   !== undefined ? { publisher: body.publisher }     : {}),
        ...(body.genre       !== undefined ? { genre: body.genre }             : {}),
        ...(body.subject     !== undefined ? { subject: body.subject }         : {}),
        ...(body.location    !== undefined ? { location: body.location }       : {}),
        ...(body.totalCopies !== undefined ? { totalCopies: body.totalCopies } : {}),
        ...(body.isActive    !== undefined ? { isActive: body.isActive }       : {}),
      },
    });

    return Response.json({ book: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primary.role_code)) throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const book = await prisma.libraryBook.findUnique({ where: { id } });
    if (!book) throw new AppError('Book not found', 404);
    if (primary.school_id && book.schoolId !== primary.school_id) throw new ForbiddenError();

    const activeIssues = await prisma.libraryIssue.count({ where: { bookId: id, status: 'issued' } });
    if (activeIssues > 0) throw new AppError('Cannot delete: book has active issues', 409);

    await prisma.libraryBook.update({ where: { id }, data: { isActive: false } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
