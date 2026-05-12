import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import ExcelJS from 'exceljs';

const ADMIN_ROLES = new Set(['super_admin', 'school_admin', 'principal']);

function styleHeader(ws: ExcelJS.Worksheet, cols: { header: string; key: string; width?: number }[]) {
  ws.columns = cols.map(c => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
  const row = ws.getRow(1);
  row.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
  row.height    = 20;
}

function zebraRows(ws: ExcelJS.Worksheet) {
  ws.eachRow((row, i) => {
    if (i > 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF5F5FF' : 'FFFFFFFF' } };
  });
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some(r => ADMIN_ROLES.has(r.role_code))) throw new ForbiddenError();

    const primaryRole = user.roles.find(r => r.is_primary) ?? user.roles[0];
    const schoolId    = primaryRole.school_id;
    const isSuperAdmin = user.roles.some(r => r.role_code === 'super_admin');
    if (!schoolId && !isSuperAdmin) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const type  = searchParams.get('type') ?? 'students';
    const month = searchParams.get('month');
    const year  = searchParams.get('year');

    // Always scope to the caller's school — super_admin without a schoolId gets all
    const where = schoolId ? { schoolId } : {};

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Yulaa';
    wb.created = new Date();

    // ── Students ──────────────────────────────────────────────────────────────
    if (type === 'students') {
      const students = await prisma.student.findMany({
        where: { ...where, status: 'active' },
        include: {
          class: true,
          parentStudents: { include: { parent: { include: { user: true } } } },
        },
        orderBy: [{ class: { grade: 'asc' } }, { firstName: 'asc' }],
      });
      const ws = wb.addWorksheet('Students');
      styleHeader(ws, [
        { header: 'Admission No', key: 'admNo',    width: 16 },
        { header: 'First Name',   key: 'first',    width: 18 },
        { header: 'Last Name',    key: 'last',     width: 18 },
        { header: 'Grade',        key: 'grade',    width: 10 },
        { header: 'Section',      key: 'section',  width: 12 },
        { header: 'Date of Birth',key: 'dob',      width: 16 },
        { header: 'Gender',       key: 'gender',   width: 10 },
        { header: 'Blood Group',  key: 'blood',    width: 12 },
        { header: 'Parent Name',  key: 'parent',   width: 22 },
        { header: 'Parent Phone', key: 'parentPh', width: 16 },
        { header: 'Parent Email', key: 'parentEm', width: 26 },
        { header: 'Enrolled On',  key: 'enrolled', width: 16 },
      ]);
      for (const s of students) {
        const parentUser = s.parentStudents[0]?.parent?.user;
        ws.addRow({
          admNo:    s.admissionNo,
          first:    s.firstName,
          last:     s.lastName,
          grade:    s.class?.grade ?? '',
          section:  s.class?.section ?? '',
          dob:      s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-IN') : '',
          gender:   s.gender ?? '',
          blood:    s.bloodGroup ?? '',
          parent:   parentUser ? `${parentUser.firstName} ${parentUser.lastName}` : '',
          parentPh: parentUser?.phone ?? '',
          parentEm: parentUser?.email ?? '',
          enrolled: new Date(s.createdAt).toLocaleDateString('en-IN'),
        });
      }
      zebraRows(ws);

    // ── Admissions ────────────────────────────────────────────────────────────
    } else if (type === 'admissions') {
      const apps = await prisma.admissionApplication.findMany({
        where,
        include: { workflow: true, children: true },
        orderBy: { submittedAt: 'desc' },
      });
      const ws = wb.addWorksheet('Admissions');
      styleHeader(ws, [
        { header: 'Application ID',  key: 'appId',   width: 14 },
        { header: 'Student Name',    key: 'name',    width: 22 },
        { header: 'Grade Applied',   key: 'grade',   width: 14 },
        { header: 'Parent Name',     key: 'parent',  width: 22 },
        { header: 'Parent Phone',    key: 'phone',   width: 16 },
        { header: 'Parent Email',    key: 'email',   width: 26 },
        { header: 'Status',          key: 'status',  width: 14 },
        { header: 'Current Step',    key: 'step',    width: 14 },
        { header: 'Submitted On',    key: 'submitted',width: 16 },
        { header: 'Last Updated',    key: 'updated', width: 16 },
      ]);
      for (const a of apps) {
        const child = a.children[0];
        ws.addRow({
          appId:     a.id.slice(0, 8).toUpperCase(),
          name:      child ? `${child.firstName} ${child.lastName}` : '—',
          grade:     (child as any)?.gradeApplying ?? '',
          parent:    a.parentName,
          phone:     a.parentPhone,
          email:     a.parentEmail,
          status:    a.status,
          step:      `Step ${a.currentStep + 1}`,
          submitted: new Date(a.submittedAt).toLocaleDateString('en-IN'),
          updated:   new Date(a.updatedAt).toLocaleDateString('en-IN'),
        });
      }
      zebraRows(ws);

    // ── Attendance ────────────────────────────────────────────────────────────
    } else if (type === 'attendance') {
      const from = new Date(Date.UTC(Number(year ?? new Date().getFullYear()), Number(month ?? new Date().getMonth() + 1) - 1, 1));
      const to   = new Date(from);
      to.setUTCMonth(to.getUTCMonth() + 1);
      to.setUTCMilliseconds(-1);

      const records = await prisma.attendance.findMany({
        where: { ...where, date: { gte: from, lte: to } },
        include: {
          student: true,
          teacher: { include: { user: true } },
        },
        orderBy: [{ date: 'asc' }],
      });
      const ws = wb.addWorksheet('Attendance');
      styleHeader(ws, [
        { header: 'Date',      key: 'date',    width: 14 },
        { header: 'Type',      key: 'type',    width: 10 },
        { header: 'Name',      key: 'name',    width: 22 },
        { header: 'Status',    key: 'status',  width: 12 },
        { header: 'Punch In',  key: 'in',      width: 14 },
        { header: 'Punch Out', key: 'out',     width: 14 },
        { header: 'Remarks',   key: 'remarks', width: 20 },
      ]);
      for (const r of records) {
        const isStudent = !!r.studentId;
        const name = isStudent
          ? `${r.student?.firstName ?? ''} ${r.student?.lastName ?? ''}`.trim()
          : `${r.teacher?.user?.firstName ?? ''} ${r.teacher?.user?.lastName ?? ''}`.trim();
        ws.addRow({
          date:    new Date(r.date).toLocaleDateString('en-IN'),
          type:    isStudent ? 'Student' : 'Teacher',
          name,
          status:  r.status,
          in:      r.punchInTime  ? new Date(r.punchInTime).toLocaleTimeString('en-IN',  { hour: '2-digit', minute: '2-digit' }) : '',
          out:     r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
          remarks: (r as any).remarks ?? '',
        });
      }
      zebraRows(ws);

    // ── Fees ──────────────────────────────────────────────────────────────────
    } else if (type === 'fees') {
      const invoices = await prisma.feeInvoice.findMany({
        where,
        include: { student: true, feeStructure: true },
        orderBy: { dueDate: 'desc' },
      });
      const ws = wb.addWorksheet('Fees');
      styleHeader(ws, [
        { header: 'Invoice #',    key: 'inv',     width: 18 },
        { header: 'Student Name', key: 'student', width: 22 },
        { header: 'Fee Type',     key: 'feeType', width: 16 },
        { header: 'Amount (₹)',   key: 'amount',  width: 14 },
        { header: 'Paid (₹)',     key: 'paid',    width: 14 },
        { header: 'Balance (₹)',  key: 'balance', width: 14 },
        { header: 'Status',       key: 'status',  width: 12 },
        { header: 'Due Date',     key: 'due',     width: 14 },
        { header: 'Paid On',      key: 'paidOn',  width: 14 },
      ]);
      for (const inv of invoices) {
        ws.addRow({
          inv:     inv.invoiceNo,
          student: `${inv.student.firstName} ${inv.student.lastName}`,
          feeType: inv.feeStructure?.name ?? `Installment ${inv.installmentNo}`,
          amount:  Number(inv.amount),
          paid:    Number(inv.paidAmount),
          balance: Number(inv.amount) - Number(inv.paidAmount),
          status:  inv.status,
          due:     new Date(inv.dueDate).toLocaleDateString('en-IN'),
          paidOn:  inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-IN') : '',
        });
      }
      zebraRows(ws);

    // ── Leave ─────────────────────────────────────────────────────────────────
    } else if (type === 'leave') {
      const leaves = await prisma.leaveRequest.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      });
      const ws = wb.addWorksheet('Leave Requests');
      styleHeader(ws, [
        { header: 'Name',       key: 'name',      width: 22 },
        { header: 'Role',       key: 'role',      width: 14 },
        { header: 'Leave Type', key: 'leaveType', width: 16 },
        { header: 'From',       key: 'from',      width: 14 },
        { header: 'To',         key: 'to',        width: 14 },
        { header: 'Days',       key: 'days',      width: 8 },
        { header: 'Reason',     key: 'reason',    width: 30 },
        { header: 'Status',     key: 'status',    width: 12 },
        { header: 'Applied On', key: 'applied',   width: 16 },
      ]);
      for (const l of leaves) {
        const from = new Date(l.startDate);
        const to   = new Date(l.endDate);
        const days = Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1;
        ws.addRow({
          name:      l.user ? `${l.user.firstName} ${l.user.lastName}` : '',
          role:      l.roleCode ?? '',
          leaveType: l.leaveType ?? '',
          from:      from.toLocaleDateString('en-IN'),
          to:        to.toLocaleDateString('en-IN'),
          days,
          reason:    l.reason ?? '',
          status:    l.status,
          applied:   new Date(l.createdAt).toLocaleDateString('en-IN'),
        });
      }
      zebraRows(ws);

    // ── Homework ──────────────────────────────────────────────────────────────
    } else if (type === 'homework') {
      const hw = await prisma.homework.findMany({
        where,
        include: { class: true, teacher: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      });
      const ws = wb.addWorksheet('Homework');
      styleHeader(ws, [
        { header: 'Title',       key: 'title',    width: 28 },
        { header: 'Subject',     key: 'subject',  width: 16 },
        { header: 'Class',       key: 'class',    width: 14 },
        { header: 'Teacher',     key: 'teacher',  width: 22 },
        { header: 'Due Date',    key: 'due',      width: 14 },
        { header: 'Assigned On', key: 'assigned', width: 16 },
      ]);
      for (const h of hw) {
        ws.addRow({
          title:    h.title,
          subject:  h.subject ?? '',
          class:    h.class ? `${h.class.grade}${h.class.section ?? ''}` : '',
          teacher:  h.teacher?.user ? `${h.teacher.user.firstName} ${h.teacher.user.lastName}` : '',
          due:      h.dueDate ? new Date(h.dueDate).toLocaleDateString('en-IN') : '',
          assigned: new Date(h.createdAt).toLocaleDateString('en-IN'),
        });
      }
      zebraRows(ws);

    } else {
      return Response.json({ error: 'Unknown export type' }, { status: 400 });
    }

    const buffer   = await wb.xlsx.writeBuffer();
    const filename = `${type}-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) { return handleError(err); }
}
