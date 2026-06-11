/**
 * Thin Zod validation helper for route handlers.
 *
 * Usage:
 *   import { parseBody } from '@/lib/validate';
 *   import { z } from 'zod';
 *
 *   const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
 *   const body = await parseBody(schema, request);
 *
 * Throws AppError(400) with a human-readable message on validation failure
 * so handleError() returns a proper 400 response to the client.
 */
import { z } from 'zod';
import { AppError } from '@/utils/errors';

export async function parseBody<T>(schema: z.ZodType<T>, request: Request): Promise<T> {
  const ct = request.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    throw new AppError('Content-Type must be application/json', 415);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppError('Request body must be valid JSON', 400);
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw new AppError(message, 400);
  }
  return result.data;
}
