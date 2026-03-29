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
  // Prisma "record not found"
  if ((err as any)?.code === 'P2025') {
    return Response.json({ error: 'Record not found' }, { status: 404 });
  }
  // Prisma unique constraint
  if ((err as any)?.code === 'P2002') {
    return Response.json({ error: 'Duplicate entry — record already exists' }, { status: 409 });
  }
  console.error('[API Error]', err);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}
