import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * API paths that do NOT require a JWT.
 * These routes handle their own authentication requirements.
 * Keep this list minimal — err toward protection.
 */
const PUBLIC_PREFIXES = [
  '/api/auth/login',
  '/api/auth/request-otp',
  '/api/auth/verify-otp',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
  '/api/admission/apply',
  '/api/admission/otp',
  '/api/admission/schools',
  '/api/admission/grades',
  '/api/admission/masters',
  '/api/form-config/public',
  // Health probe — public for load balancers and uptime monitors
  '/api/health',
  // Cron and debug routes authenticate via their own secrets / role checks.
  // They are still included here so middleware doesn't double-reject them,
  // but they must enforce their own auth inside the route handler.
  '/api/cron/',
  '/api/debug/',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return req.cookies.get('token')?.value ?? null;
}

/**
 * Verify an HS256 JWT using the Web Crypto API.
 * Edge-compatible: no Node.js-only crypto imports.
 * Does NOT hit the database — route handlers do that via getUserFromRequest.
 */
async function verifyJwt(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Decode payload and check expiry (fast-fail before the crypto operation)
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;

    // Verify HMAC-SHA256 signature
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigB64 = parts[2].replace(/-/g, '+').replace(/_/g, '/');
    const padded = sigB64 + '='.repeat((4 - (sigB64.length % 4)) % 4);
    const sigBuf = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));

    return await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(`${parts[0]}.${parts[1]}`));
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard API routes — page routes handle their own redirect logic
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  // Allow public paths through without a token
  if (isPublic(pathname)) return NextResponse.next();

  const token = extractToken(request);
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // JWT_SECRET not configured — fail closed rather than open
    console.error('[middleware] JWT_SECRET is not set — all authenticated routes are blocked');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const valid = await verifyJwt(token, secret);
  if (!valid) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  // Run on all API routes; Next.js static files and page routes are excluded
  matcher: ['/api/:path*'],
};
