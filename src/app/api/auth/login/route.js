import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.status,
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
       WHERE u.email = $1
       GROUP BY u.id`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return Response.json({ error: 'Account is inactive' }, { status: 403 });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // ── Consultant contract expiry check ─────────────────────────────────────
    const isConsultant = user.roles.some(r => r.role_code === 'consultant');
    if (isConsultant) {
      const contractRes = await query(
        `SELECT cc.end_date, cc.status, cc.contract_no, sch.name as school_name
         FROM consultant_contracts cc
         JOIN consultants c ON c.id = cc.consultant_id
         JOIN schools sch ON sch.id = cc.school_id
         WHERE c.user_id = $1
         ORDER BY cc.end_date DESC
         LIMIT 1`,
        [user.id]
      );

      if (contractRes.rows.length === 0) {
        return Response.json(
          { error: 'No contract found for your account. Contact the school administrator.' },
          { status: 403 }
        );
      }

      const contract = contractRes.rows[0];
      const isExpired =
        new Date(contract.end_date) < new Date() || contract.status === 'expired' || contract.status === 'terminated';

      if (isExpired) {
        const expiredOn = new Date(contract.end_date).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric',
        });
        return Response.json(
          {
            error: `Your consulting contract (${contract.contract_no}) expired on ${expiredOn}. Please contact ${contract.school_name} to renew your contract.`,
            code: 'CONTRACT_EXPIRED',
          },
          { status: 403 }
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
    const token = signToken({
      userId: user.id,
      email: user.email,
      primaryRole: primaryRole.role_code,
      schoolId: primaryRole.school_id,
    });

    return Response.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles,
        primaryRole: primaryRole.role_code,
        schoolId: primaryRole.school_id,
        schoolName: primaryRole.school_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
