/** True only during local development — use to gate debug logs */
export const isDev = process.env.NODE_ENV === 'development';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/** Converts any thrown value into a Response */
export function handleError(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json(
      { error: err.message, ...(err.code && { code: err.code }) },
      { status: err.status },
    );
  }

  const prismaCode = (err as any)?.code;

  // Prisma "record not found"
  if (prismaCode === 'P2025') {
    const cause = (err as any)?.meta?.cause ?? '';
    return Response.json(
      { error: cause ? `Record not found: ${cause}` : 'Record not found' },
      { status: 404 },
    );
  }

  // Prisma unique constraint violation
  if (prismaCode === 'P2002') {
    const fields: string[] = (err as any)?.meta?.target ?? [];
    const fieldHint = fields.length > 0 ? ` (${fields.join(', ')})` : '';
    return Response.json(
      { error: `A record with the same value already exists${fieldHint}` },
      { status: 409 },
    );
  }

  // Prisma foreign key constraint failed
  if (prismaCode === 'P2003') {
    const field = (err as any)?.meta?.field_name ?? '';
    return Response.json(
      { error: field ? `Related record not found for field: ${field}` : 'Related record not found — check that all referenced IDs exist' },
      { status: 400 },
    );
  }

  // Prisma required relation violation
  if (prismaCode === 'P2014') {
    return Response.json(
      { error: 'Cannot delete — this record is still referenced by other records' },
      { status: 409 },
    );
  }

  // Prisma record required but not found in query
  if (prismaCode === 'P2016') {
    return Response.json({ error: 'Required record not found' }, { status: 404 });
  }

  // Prisma transaction timeout
  if (prismaCode === 'P2028') {
    return Response.json(
      { error: 'The operation timed out — please try again' },
      { status: 503 },
    );
  }

  // Prisma connection failed
  if (prismaCode === 'P1001' || prismaCode === 'P1002') {
    console.error('[DB Connection Error]', err);
    return Response.json(
      { error: 'Database connection failed — please try again shortly' },
      { status: 503 },
    );
  }

  console.error('[API Error]', err);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}
