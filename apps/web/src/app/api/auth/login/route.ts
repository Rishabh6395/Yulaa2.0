import { login } from '@/modules/auth/auth.service';
import { handleError } from '@/utils/errors';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await login(body);

    const response = NextResponse.json(result);

    response.cookies.set('session_token', result.token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24, // 24hrs in seconds
    });
    return response;
  } catch (err) {
    return handleError(err);
  }
}
