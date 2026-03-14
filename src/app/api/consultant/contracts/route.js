import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// GET /api/consultant/contracts — returns consultant's contracts (for the consultant's own view)
export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const isConsultant = primaryRole.role_code === 'consultant';
  const isAdmin = ['super_admin', 'school_admin'].includes(primaryRole.role_code);

  if (!isConsultant && !isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    let result;

    if (isConsultant) {
      result = await query(
        `SELECT cc.id, cc.contract_no, cc.start_date, cc.end_date,
                cc.contract_value, cc.status, cc.notes, cc.created_at,
                sch.name as school_name, sch.contact_email as school_email
         FROM consultant_contracts cc
         JOIN consultants c ON c.id = cc.consultant_id
         JOIN schools sch ON sch.id = cc.school_id
         WHERE c.user_id = $1
         ORDER BY cc.end_date DESC`,
        [user.id]
      );
    } else {
      // Admin: see all consultant contracts for their school
      result = await query(
        `SELECT cc.id, cc.contract_no, cc.start_date, cc.end_date,
                cc.contract_value, cc.status, cc.notes, cc.created_at,
                u.first_name || ' ' || u.last_name as consultant_name,
                u.email as consultant_email,
                c.specialization
         FROM consultant_contracts cc
         JOIN consultants c ON c.id = cc.consultant_id
         JOIN users u ON u.id = c.user_id
         WHERE cc.school_id = $1
         ORDER BY cc.end_date DESC`,
        [primaryRole.school_id]
      );
    }

    // Compute days remaining for each contract
    const contracts = result.rows.map(c => {
      const endDate = new Date(c.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      return { ...c, days_remaining: daysLeft };
    });

    return Response.json({ contracts });
  } catch (err) {
    console.error('Contracts GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
