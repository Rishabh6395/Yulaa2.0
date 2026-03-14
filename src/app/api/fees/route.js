import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const schoolId = primaryRole.school_id;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const studentId = searchParams.get('student_id');

  try {
    let where = 'WHERE fi.school_id = $1';
    const params = [schoolId];
    let idx = 2;

    if (status) {
      where += ` AND fi.status = $${idx++}`;
      params.push(status);
    }
    if (studentId) {
      where += ` AND fi.student_id = $${idx++}`;
      params.push(studentId);
    }

    const result = await query(
      `SELECT fi.id, fi.invoice_no, fi.amount, fi.due_date, fi.status, fi.paid_amount, fi.paid_at, fi.installment_no,
              s.first_name || ' ' || s.last_name as student_name, s.admission_no,
              c.grade, c.section
       FROM fee_invoices fi
       JOIN students s ON s.id = fi.student_id
       LEFT JOIN classes c ON c.id = s.class_id
       ${where}
       ORDER BY fi.due_date DESC`,
      params
    );

    // Summary
    const summaryRes = await query(
      `SELECT
         COALESCE(SUM(amount), 0) as total,
         COALESCE(SUM(paid_amount), 0) as collected,
         COALESCE(SUM(amount - paid_amount) FILTER (WHERE status IN ('unpaid', 'overdue', 'partial')), 0) as pending,
         COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
         COUNT(*) FILTER (WHERE status = 'unpaid') as unpaid_count
       FROM fee_invoices WHERE school_id = $1`,
      [schoolId]
    );

    return Response.json({
      invoices: result.rows,
      summary: summaryRes.rows[0],
    });
  } catch (err) {
    console.error('Fees GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const schoolId = primaryRole.school_id;

  try {
    const body = await request.json();
    const { student_id, amount, due_date, installment_no } = body;

    if (!student_id || !amount || !due_date) {
      return Response.json({ error: 'student_id, amount, and due_date required' }, { status: 400 });
    }

    const invoiceNo = `INV-${Date.now()}`;
    const result = await query(
      `INSERT INTO fee_invoices (school_id, student_id, invoice_no, amount, due_date, installment_no)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [schoolId, student_id, invoiceNo, amount, due_date, installment_no || 1]
    );

    return Response.json({ invoice: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Fees POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
