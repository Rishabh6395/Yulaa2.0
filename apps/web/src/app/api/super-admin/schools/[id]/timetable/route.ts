import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

function assertAdminAccess(user: any) {
  if (!user) throw new UnauthorizedError();
  if (!user.roles.some((r: any) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError();
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdminAccess(user);
    const schoolId = params.id;
    const url = new URL(request.url);
    const classId      = url.searchParams.get('classId');
    const academicYear = url.searchParams.get('year') || '2025-2026';
    const action       = url.searchParams.get('action');

    // ── Template download ────────────────────────────────────────────────────
    if (action === 'template') {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Timetable');
      ws.columns = [
        { header: 'class_id',   key: 'class_id',   width: 36 },
        { header: 'day_of_week', key: 'day_of_week', width: 12 },
        { header: 'period_no',  key: 'period_no',  width: 10 },
        { header: 'start_time', key: 'start_time', width: 12 },
        { header: 'end_time',   key: 'end_time',   width: 12 },
        { header: 'subject',    key: 'subject',    width: 20 },
        { header: 'teacher_id', key: 'teacher_id', width: 36 },
      ];
      ws.addRow({ class_id: '<uuid>', day_of_week: 1, period_no: 1, start_time: '08:00', end_time: '08:45', subject: 'Mathematics', teacher_id: '<uuid or blank>' });
      ws.addRow({ class_id: '<uuid>', day_of_week: 1, period_no: 2, start_time: '08:45', end_time: '09:30', subject: 'English',     teacher_id: '<uuid or blank>' });
      // Style header row
      ws.getRow(1).font = { bold: true };
      const buf = await wb.xlsx.writeBuffer();
      return new Response(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="timetable-template.xlsx"',
        },
      });
    }

    if (!classId) {
      // Return all timetables for school (summary)
      const timetables = await prisma.timetable.findMany({
        where: { schoolId, academicYear },
        include: {
          class: { select: { id: true, name: true, grade: true, section: true } },
          _count: { select: { slots: true } },
        },
        orderBy: [{ class: { grade: 'asc' } }, { class: { section: 'asc' } }],
      });
      return Response.json({ timetables });
    }

    const timetable = await prisma.timetable.findUnique({
      where: { schoolId_classId_academicYear: { schoolId, classId, academicYear } },
      include: {
        class: { select: { id: true, name: true, grade: true, section: true } },
        slots: {
          include: { teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } },
          orderBy: [{ dayOfWeek: 'asc' }, { periodNo: 'asc' }],
        },
      },
    });
    return Response.json({ timetable });
  } catch (err) { return handleError(err); }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdminAccess(user);
    const schoolId = params.id;
    const body = await request.json();
    const { action } = body;

    // ── Bulk Excel/CSV upload ────────────────────────────────────────────────
    if (action === 'bulk_upload') {
      const { fileData, fileExt, academicYear = '2025-2026' } = body;
      if (!fileData) throw new AppError('fileData (base64) is required');

      const buf = Buffer.from(fileData, 'base64');
      type RawRow = { class_id: string; day_of_week: number; period_no: number; start_time: string; end_time: string; subject: string; teacher_id?: string };
      const rows: RawRow[] = [];

      if (fileExt === 'csv') {
        const lines = buf.toString('utf-8').split('\n').map((l: string) => l.trim()).filter(Boolean);
        for (const line of lines.slice(1)) {
          const [class_id, day_str, period_str, start_time, end_time, subject, teacher_id] = line
            .split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''));
          if (class_id && day_str && period_str && start_time && end_time && subject) {
            rows.push({ class_id, day_of_week: parseInt(day_str, 10), period_no: parseInt(period_str, 10), start_time, end_time, subject, teacher_id: teacher_id || undefined });
          }
        }
      } else {
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await wb.xlsx.load(buf as any);
        const ws = wb.worksheets[0];
        ws.eachRow((row: any, rowNum: number) => {
          if (rowNum === 1) return;
          const class_id   = row.getCell(1).value?.toString?.()?.trim();
          const day_of_week = parseInt(row.getCell(2).value?.toString?.() || '0', 10);
          const period_no  = parseInt(row.getCell(3).value?.toString?.() || '0', 10);
          const start_time = row.getCell(4).value?.toString?.()?.trim();
          const end_time   = row.getCell(5).value?.toString?.()?.trim();
          const subject    = row.getCell(6).value?.toString?.()?.trim();
          const teacher_id = row.getCell(7).value?.toString?.()?.trim() || undefined;
          if (class_id && day_of_week && period_no && start_time && end_time && subject) {
            rows.push({ class_id, day_of_week, period_no, start_time, end_time, subject, teacher_id });
          }
        });
      }

      if (!rows.length) throw new AppError('No valid rows found in uploaded file');

      // Validate class IDs belong to this school
      const classIds = [...new Set(rows.map(r => r.class_id))];
      const validClasses = await prisma.class.findMany({
        where: { schoolId, id: { in: classIds } },
        select: { id: true },
      });
      const validClassSet = new Set(validClasses.map(c => c.id));

      // Validate teacher IDs if provided
      const teacherIds = [...new Set(rows.filter(r => r.teacher_id).map(r => r.teacher_id!))];
      const validTeachers = teacherIds.length
        ? await prisma.teacher.findMany({ where: { schoolId, id: { in: teacherIds } }, select: { id: true } })
        : [];
      const validTeacherSet = new Set(validTeachers.map(t => t.id));

      // Group rows by classId
      const byClass: Record<string, RawRow[]> = {};
      for (const row of rows) {
        if (!validClassSet.has(row.class_id)) continue;
        if (row.teacher_id && !validTeacherSet.has(row.teacher_id)) row.teacher_id = undefined;
        (byClass[row.class_id] ??= []).push(row);
      }

      let saved = 0; let skipped = rows.length;
      for (const [classId, classRows] of Object.entries(byClass)) {
        const timetable = await prisma.timetable.upsert({
          where: { schoolId_classId_academicYear: { schoolId, classId, academicYear } },
          update: { isActive: true },
          create: { schoolId, classId, academicYear, isActive: true },
        });
        await prisma.timetableSlot.deleteMany({ where: { timetableId: timetable.id } });
        await prisma.timetableSlot.createMany({
          data: classRows.map(r => ({
            timetableId: timetable.id,
            dayOfWeek:   r.day_of_week,
            periodNo:    r.period_no,
            startTime:   r.start_time,
            endTime:     r.end_time,
            subject:     r.subject,
            teacherId:   r.teacher_id || null,
          })),
        });
        saved   += classRows.length;
        skipped -= classRows.length;
      }

      return Response.json({ saved, skipped, total: rows.length, classes: Object.keys(byClass).length });
    }

    // ── Admin reassignment (proxy) ───────────────────────────────────────────
    if (action === 'reassign') {
      const { slotId, substituteTeacherId, startDate, endDate, reason, proxyTeacherId } = body;
      if (!slotId || !substituteTeacherId || !startDate || !endDate)
        throw new AppError('slotId, substituteTeacherId, startDate, endDate required');

      const start = new Date(startDate);
      const end   = new Date(endDate);
      if (end < start) throw new AppError('endDate must be on or after startDate');

      const slot = await prisma.timetableSlot.findFirst({
        where: { id: slotId, timetable: { schoolId } },
        select: { id: true, teacherId: true },
      });
      if (!slot) throw new AppError('Slot not found', 404);

      const originalTeacherId = proxyTeacherId || slot.teacherId;
      if (!originalTeacherId) throw new AppError('Slot has no assigned teacher to reassign from');

      const substitute = await prisma.teacher.findFirst({
        where: { id: substituteTeacherId, schoolId },
        select: { id: true },
      });
      if (!substitute) throw new AppError('Substitute teacher not found');

      const overlapping = await prisma.timetableReassignment.findFirst({
        where: { slotId, isActive: true, startDate: { lte: end }, endDate: { gte: start } },
      });
      if (overlapping) throw new AppError('An active reassignment already exists for this slot in the date range');

      const reassignment = await prisma.timetableReassignment.create({
        data: { slotId, originalTeacherId, substituteTeacherId, startDate: start, endDate: end, reason: reason || null, createdBy: user!.id, isActive: true },
      });
      return Response.json({ reassignment }, { status: 201 });
    }

    // ── Save full timetable (upsert slots) ───────────────────────────────────
    const { classId, academicYear = '2025-2026', slots } = body;
    if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

    const timetable = await prisma.timetable.upsert({
      where: { schoolId_classId_academicYear: { schoolId, classId, academicYear } },
      update: { isActive: true },
      create: { schoolId, classId, academicYear, isActive: true },
    });

    await prisma.timetableSlot.deleteMany({ where: { timetableId: timetable.id } });

    if (Array.isArray(slots) && slots.length > 0) {
      await prisma.timetableSlot.createMany({
        data: slots.map((s: any) => ({
          timetableId: timetable.id,
          dayOfWeek:  s.dayOfWeek,
          periodNo:   s.periodNo,
          startTime:  s.startTime,
          endTime:    s.endTime,
          subject:    s.subject,
          teacherId:  s.teacherId || null,
        })),
      });
    }

    const updated = await prisma.timetable.findUnique({
      where: { id: timetable.id },
      include: {
        slots: {
          include: { teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } },
          orderBy: [{ dayOfWeek: 'asc' }, { periodNo: 'asc' }],
        },
      },
    });
    return Response.json({ timetable: updated });
  } catch (err) { return handleError(err); }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdminAccess(user);
    const schoolId = params.id;
    const url = new URL(request.url);
    const classId      = url.searchParams.get('classId');
    const academicYear = url.searchParams.get('year') || '2025-2026';
    if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

    await prisma.timetable.deleteMany({ where: { schoolId, classId, academicYear } });
    return Response.json({ success: true });
  } catch (err) { return handleError(err); }
}
