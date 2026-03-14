import jwt from 'jsonwebtoken';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'yulaa-dev-secret-change-in-production';
const JWT_EXPIRY = '7d';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request) {
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

export async function getUserFromRequest(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const result = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
            json_agg(json_build_object(
              'role_code', r.code,
              'role_name', r.display_name,
              'school_id', ur.school_id,
              'school_name', s.name,
              'is_primary', ur.is_primary
            )) as roles
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     LEFT JOIN schools s ON s.id = ur.school_id
     WHERE u.id = $1 AND u.status = 'active'
     GROUP BY u.id`,
    [decoded.userId]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0];
}

export function requireAuth(handler) {
  return async (request, context) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    request.user = user;
    return handler(request, context);
  };
}
