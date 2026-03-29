import jwt from 'jsonwebtoken';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'yulaa-dev-secret-change-in-production';
const JWT_EXPIRY = '7d';

export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface UserRole {
  role_code: string;
  role_name: string;
  school_id: string | null;
  school_name: string | null;
  is_primary: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  roles: UserRole[];
}

export function signToken(payload: object, expiresIn: string = JWT_EXPIRY): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as any);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId, status: 'active' },
    include: {
      userRoles: {
        include: {
          role: true,
          school: true,
        },
      },
    },
  });

  if (!user) return null;

  const roles: UserRole[] = user.userRoles.map((ur) => ({
    role_code: ur.role.code,
    role_name: ur.role.displayName,
    school_id: ur.schoolId,
    school_name: ur.school?.name ?? null,
    is_primary: ur.isPrimary,
  }));

  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    phone: user.phone,
    avatar_url: user.avatarUrl,
    roles,
  };
}
