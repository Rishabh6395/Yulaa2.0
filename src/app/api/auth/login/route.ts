import { login } from '@/modules/auth/auth.service';
import { handleError } from '@/utils/errors';

export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const result = await login(body);
    return Response.json(result);
  } catch (err) {
    return handleError(err);
  }
}
