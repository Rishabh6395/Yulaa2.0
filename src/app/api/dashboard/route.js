import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('student_id');
  const isParent = user.roles.some(r => r.role_code === 'parent');

  // Parent view: return child-specific stats
  if (isParent && studentId) {
    try {
      // Validate parent has access to this student
      const studentRes = await query(
        `SELECT s.id, s.school_id, s.class_id, s.first_name, s.last_name,
                c.grade, c.section
         FROM students s
         LEFT JOIN classes c ON c.id = s.class_id
         JOIN parent_students ps ON ps.student_id = s.id
         JOIN parents p ON p.id = ps.parent_id
         WHERE s.id = $1 AND p.user_id = $2`,
        [studentId, user.id]
      );

      if (studentRes.rows.length === 0) {
        return Response.json({ error: 'Student not found or access denied' }, { status: 404 });
      }

      const student = studentRes.rows[0];
      const childSchoolId = student.school_id;
      const today = new Date().toISOString().split('T')[0];
      const month = today.substring(0, 7); // YYYY-MM

      // Today's attendance status for this student
      const todayAttendanceRes = await query(
        `SELECT status FROM attendance WHERE student_id = $1 AND date = $2`,
        [studentId, today]
      );

      // This month's attendance summary
      const monthAttendanceRes = await query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'present') as present,
           COUNT(*) FILTER (WHERE status = 'absent') as absent,
           COUNT(*) FILTER (WHERE status = 'late') as late,
           COUNT(*) as total
         FROM attendance
         WHERE student_id = $1 AND to_char(date, 'YYYY-MM') = $2`,
        [studentId, month]
      );

      // Fee summary for this student
      const feeRes = await query(
        `SELECT
           COALESCE(SUM(amount), 0) as total,
           COALESCE(SUM(paid_amount), 0) as collected,
           COALESCE(SUM(amount - paid_amount) FILTER (WHERE status IN ('unpaid', 'overdue', 'partial')), 0) as pending,
           COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
           COUNT(*) FILTER (WHERE status IN ('unpaid', 'overdue', 'partial')) as due_count
         FROM fee_invoices WHERE student_id = $1`,
        [studentId]
      );

      // Recent homework for this student's class (with submission status)
      const hwRes = student.class_id ? await query(
        `SELECT h.id, h.subject, h.title, h.due_date, h.status,
                c.grade, c.section,
                hs.status as submission_status
         FROM homework h
         JOIN classes c ON c.id = h.class_id
         LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = $1
         WHERE h.class_id = $2 AND h.status = 'active'
         ORDER BY h.due_date ASC
         LIMIT 5`,
        [studentId, student.class_id]
      ) : { rows: [] };

      // Recent announcements from this child's school (for parents/all)
      const announcementsRes = await query(
        `SELECT id, title, message, type, audience, published_at
         FROM announcements
         WHERE school_id = $1 AND (audience = 'all' OR audience = 'parents')
         ORDER BY published_at DESC LIMIT 5`,
        [childSchoolId]
      );

      const attendance = monthAttendanceRes.rows[0];
      const fees = feeRes.rows[0];
      const attendanceRate = parseInt(attendance.total) > 0
        ? Math.round((parseInt(attendance.present) / parseInt(attendance.total)) * 100)
        : 0;

      return Response.json({
        isParentView: true,
        student,
        stats: {
          todayStatus: todayAttendanceRes.rows[0]?.status || null,
          monthAttendance: {
            present: parseInt(attendance.present),
            absent: parseInt(attendance.absent),
            late: parseInt(attendance.late),
            total: parseInt(attendance.total),
            rate: attendanceRate,
          },
          fees: {
            total: parseFloat(fees.total),
            collected: parseFloat(fees.collected),
            pending: parseFloat(fees.pending),
            overdueCount: parseInt(fees.overdue_count),
            dueCount: parseInt(fees.due_count),
          },
        },
        recentAnnouncements: announcementsRes.rows,
        recentHomework: hwRes.rows,
      });
    } catch (err) {
      console.error('Parent dashboard error:', err);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // Admin / teacher / default view
  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const schoolId = primaryRole.school_id;

  try {
    const studentsRes = await query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE admission_status = 'approved') as approved,
              COUNT(*) FILTER (WHERE admission_status = 'pending') as pending
       FROM students WHERE school_id = $1`,
      [schoolId]
    );

    const today = new Date().toISOString().split('T')[0];
    const attendanceRes = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'present') as present,
         COUNT(*) FILTER (WHERE status = 'absent') as absent,
         COUNT(*) FILTER (WHERE status = 'late') as late,
         COUNT(*) as total
       FROM attendance
       WHERE school_id = $1 AND date = $2`,
      [schoolId, today]
    );

    const feeRes = await query(
      `SELECT
         COALESCE(SUM(amount), 0) as total_fees,
         COALESCE(SUM(paid_amount), 0) as collected,
         COALESCE(SUM(amount - paid_amount) FILTER (WHERE status IN ('unpaid', 'overdue', 'partial')), 0) as pending_amount,
         COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count
       FROM fee_invoices WHERE school_id = $1`,
      [schoolId]
    );

    const announcementsRes = await query(
      `SELECT id, title, message, type, audience, published_at
       FROM announcements
       WHERE school_id = $1
       ORDER BY published_at DESC LIMIT 5`,
      [schoolId]
    );

    const teachersRes = await query(
      `SELECT COUNT(*) as total FROM teachers WHERE school_id = $1 AND status = 'active'`,
      [schoolId]
    );

    const classesRes = await query(
      `SELECT COUNT(*) as total FROM classes WHERE school_id = $1`,
      [schoolId]
    );

    const hwRes = await query(
      `SELECT h.id, h.subject, h.title, h.due_date, h.status,
              c.grade, c.section,
              u.first_name || ' ' || u.last_name as teacher_name
       FROM homework h
       JOIN classes c ON c.id = h.class_id
       JOIN teachers t ON t.id = h.teacher_id
       JOIN users u ON u.id = t.user_id
       WHERE h.school_id = $1
       ORDER BY h.created_at DESC LIMIT 5`,
      [schoolId]
    );

    const students = studentsRes.rows[0];
    const attendance = attendanceRes.rows[0];
    const fees = feeRes.rows[0];
    const attendanceRate = attendance.total > 0
      ? Math.round((parseInt(attendance.present) / parseInt(attendance.total)) * 100)
      : 0;

    return Response.json({
      stats: {
        totalStudents: parseInt(students.total),
        approvedStudents: parseInt(students.approved),
        pendingAdmissions: parseInt(students.pending),
        totalTeachers: parseInt(teachersRes.rows[0].total),
        totalClasses: parseInt(classesRes.rows[0].total),
        todayAttendance: {
          present: parseInt(attendance.present),
          absent: parseInt(attendance.absent),
          late: parseInt(attendance.late),
          total: parseInt(attendance.total),
          rate: attendanceRate,
        },
        fees: {
          totalFees: parseFloat(fees.total_fees),
          collected: parseFloat(fees.collected),
          pending: parseFloat(fees.pending_amount),
          overdueCount: parseInt(fees.overdue_count),
        },
      },
      recentAnnouncements: announcementsRes.rows,
      recentHomework: hwRes.rows,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
