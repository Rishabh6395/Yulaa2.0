/**
 * GET /api/performance/kpi
 * Compute all enabled KPIs for a school and return them with actual vs target values.
 *
 * Query params:
 *   schoolId       – required for super_admin, auto-resolved for others
 *   academicYear   – optional, defaults to current academic year
 *   role           – optional filter: only return KPIs visible to this role
 *   classId        – optional: scope student/attendance KPIs to a specific class
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import { KPI_DEFINITIONS, KPI_MAP, type KpiDef } from '@/lib/kpiDefinitions';
import prisma from '@/lib/prisma';

function getPrimary(user: any) {
  return user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
}
function getSchoolId(user: any, override?: string | null): string {
  const p = getPrimary(user);
  if (p.role_code === 'super_admin' && override) return override;
  if (p.school_id) return p.school_id;
  throw new AppError('No school found');
}
function currentAcademicYear() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  return m >= 4 ? `${y}-${(y + 1).toString().slice(2)}` : `${y - 1}-${y.toString().slice(2)}`;
}
function pct(num: number, den: number) { return den > 0 ? Math.round((num / den) * 100) : 0; }

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary = getPrimary(user);
    const role    = primary.role_code;

    // Parents and students don't access this endpoint (use performance route instead)
    if (['parent', 'student'].includes(role)) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const schoolId     = getSchoolId(user, searchParams.get('schoolId'));
    const academicYear = searchParams.get('academicYear') || currentAcademicYear();
    const filterRole   = searchParams.get('role') || role;
    const classId      = searchParams.get('classId') || null;

    // Load school KPI config overrides
    let storedConfigs: any[] = [];
    try {
      storedConfigs = await prisma.schoolKpiConfig.findMany({
        where: { schoolId, academicYear },
      });
    } catch { /* table may not exist yet — use all defaults */ }
    const cfgMap: Record<string, any> = Object.fromEntries(storedConfigs.map(s => [s.kpiCode, s]));

    // Filter to enabled KPIs visible to this role
    const activeDefs = KPI_DEFINITIONS.filter(def => {
      const cfg = cfgMap[def.code];
      const enabled = cfg ? cfg.isEnabled : true;
      const visible = def.visibleTo.includes(filterRole) || def.visibleTo.includes('super_admin');
      return enabled && visible;
    });

    // Compute all KPI values in parallel
    const results = await Promise.all(activeDefs.map(def => computeKpi(def, schoolId, academicYear, classId, cfgMap)));

    return Response.json({ kpis: results, schoolId, academicYear, role: filterRole });
  } catch (err) { return handleError(err); }
}

// ─── KPI computation ──────────────────────────────────────────────────────────

async function computeKpi(
  def: KpiDef,
  schoolId: string,
  academicYear: string,
  classId: string | null,
  cfgMap: Record<string, any>,
): Promise<KpiResult> {
  const cfg     = cfgMap[def.code];
  const target  = cfg ? Number(cfg.targetValue) : def.defaultTarget;
  const dir     = cfg?.targetDirection ?? def.targetDirection;

  let value: number | null = null;
  let breakdown: any       = null;

  try {
    const r = await COMPUTERS[def.code]?.(schoolId, academicYear, classId);
    value     = r?.value ?? null;
    breakdown = r?.breakdown ?? null;
  } catch { value = null; }

  const status = computeStatus(value, target, dir, def.higherIsBetter);

  return {
    code:           def.code,
    name:           def.name,
    category:       def.category,
    unit:           def.unit,
    value,
    target,
    targetDirection: dir,
    status,
    breakdown,
  };
}

interface KpiResult {
  code:            string;
  name:            string;
  category:        string;
  unit:            string;
  value:           number | null;
  target:          number;
  targetDirection: string;
  status:          'on_track' | 'at_risk' | 'off_track' | 'no_data';
  breakdown:       any;
}

function computeStatus(
  value: number | null,
  target: number,
  dir: string,
  higherIsBetter: boolean,
): KpiResult['status'] {
  if (value === null) return 'no_data';
  if (dir === 'above') {
    if (value >= target) return 'on_track';
    if (value >= target * 0.9) return 'at_risk';
    return 'off_track';
  } else {
    if (value <= target) return 'on_track';
    if (value <= target * 1.1) return 'at_risk';
    return 'off_track';
  }
}

type ComputeFn = (schoolId: string, academicYear: string, classId: string | null) => Promise<{ value: number; breakdown?: any } | null>;
const COMPUTERS: Record<string, ComputeFn> = {

  // ── Student Performance ───────────────────────────────────────────────────

  async student_avg_score(schoolId, _ay, classId) {
    const where: any = { exam: { schoolId, ...(classId ? { classId } : {}) } };
    const agg = await prisma.examResult.aggregate({ where, _avg: { marksObtained: true }, _count: { id: true } });
    if (!agg._count.id) return null;
    const maxAgg = await prisma.examResult.aggregate({ where, _avg: { maxMarks: true } });
    const avg = Number(agg._avg.marksObtained ?? 0);
    const max = Number(maxAgg._avg.maxMarks ?? 100);
    return { value: Math.round((avg / max) * 100) };
  },

  async pass_percentage(schoolId, _ay, classId) {
    const where: any = { exam: { schoolId, ...(classId ? { classId } : {}) } };
    const results = await prisma.examResult.findMany({
      where,
      select: { marksObtained: true, maxMarks: true, exam: { select: { passingMarks: true } } },
    });
    if (!results.length) return null;
    const passed = results.filter(r => {
      const passMark = (r.exam as any)?.passingMarks ?? 35;
      return Number(r.marksObtained) >= passMark;
    }).length;
    return { value: pct(passed, results.length), breakdown: { total: results.length, passed } };
  },

  async subject_performance(schoolId, _ay, classId) {
    const where: any = { exam: { schoolId, ...(classId ? { classId } : {}) } };
    const results = await prisma.examResult.findMany({ where, select: { subject: true, marksObtained: true, maxMarks: true } });
    if (!results.length) return null;
    const bySubject: Record<string, { sum: number; max: number; count: number }> = {};
    for (const r of results) {
      if (!bySubject[r.subject]) bySubject[r.subject] = { sum: 0, max: 0, count: 0 };
      bySubject[r.subject].sum   += Number(r.marksObtained);
      bySubject[r.subject].max   += r.maxMarks;
      bySubject[r.subject].count += 1;
    }
    const subjectAvgs = Object.entries(bySubject).map(([subject, d]) => ({
      subject, avg: Math.round((d.sum / d.max) * 100),
    }));
    const overallAvg = Math.round(subjectAvgs.reduce((s, x) => s + x.avg, 0) / subjectAvgs.length);
    return { value: overallAvg, breakdown: subjectAvgs.sort((a, b) => b.avg - a.avg) };
  },

  async top_performer_ratio(schoolId, _ay, classId) {
    const where: any = { exam: { schoolId, ...(classId ? { classId } : {}) } };
    const results = await prisma.examResult.findMany({ where, select: { studentId: true, marksObtained: true, maxMarks: true } });
    if (!results.length) return null;
    const byStudent: Record<string, { sum: number; max: number }> = {};
    for (const r of results) {
      if (!byStudent[r.studentId]) byStudent[r.studentId] = { sum: 0, max: 0 };
      byStudent[r.studentId].sum += Number(r.marksObtained);
      byStudent[r.studentId].max += r.maxMarks;
    }
    const students = Object.values(byStudent);
    const top = students.filter(s => s.max > 0 && (s.sum / s.max) >= 0.9).length;
    return { value: pct(top, students.length), breakdown: { total: students.length, top } };
  },

  async weak_student_ratio(schoolId, _ay, classId) {
    const where: any = { exam: { schoolId, ...(classId ? { classId } : {}) } };
    const results = await prisma.examResult.findMany({ where, select: { studentId: true, marksObtained: true, maxMarks: true } });
    if (!results.length) return null;
    const byStudent: Record<string, { sum: number; max: number }> = {};
    for (const r of results) {
      if (!byStudent[r.studentId]) byStudent[r.studentId] = { sum: 0, max: 0 };
      byStudent[r.studentId].sum += Number(r.marksObtained);
      byStudent[r.studentId].max += r.maxMarks;
    }
    const students = Object.values(byStudent);
    const weak = students.filter(s => s.max > 0 && (s.sum / s.max) < 0.4).length;
    return { value: pct(weak, students.length), breakdown: { total: students.length, weak } };
  },

  async homework_completion_rate(schoolId, _ay, classId) {
    const where: any = { homework: { schoolId, ...(classId ? { classId } : {}) } };
    const subs = await prisma.homeworkSubmission.findMany({ where, select: { status: true } });
    if (!subs.length) return null;
    const done = subs.filter(s => ['submitted', 'graded'].includes(s.status)).length;
    return { value: pct(done, subs.length), breakdown: { total: subs.length, submitted: done } };
  },

  async assignment_delay_rate(schoolId, _ay, classId) {
    const where: any = { homework: { schoolId, ...(classId ? { classId } : {}) } };
    const subs = await prisma.homeworkSubmission.findMany({ where, select: { status: true } });
    if (!subs.length) return null;
    const late = subs.filter(s => s.status === 'late').length;
    return { value: pct(late, subs.length), breakdown: { total: subs.length, late } };
  },

  // ── Attendance ────────────────────────────────────────────────────────────

  async student_attendance_pct(schoolId, _ay, classId) {
    const where: any = { schoolId, student: { status: 'active' }, ...(classId ? { classId } : {}) };
    const att = await prisma.attendance.findMany({ where: { ...where, studentId: { not: null } }, select: { status: true } });
    if (!att.length) return null;
    const present = att.filter(a => ['present', 'late'].includes(a.status)).length;
    return { value: pct(present, att.length) };
  },

  async chronic_absenteeism(schoolId, _ay, classId) {
    const where: any = { schoolId, studentId: { not: null }, ...(classId ? { classId } : {}) };
    const att = await prisma.attendance.findMany({ where, select: { studentId: true, status: true } });
    if (!att.length) return null;
    const byStudent: Record<string, { present: number; total: number }> = {};
    for (const a of att) {
      const sid = (a as any).studentId ?? '';
      if (!sid) continue;
      if (!byStudent[sid]) byStudent[sid] = { present: 0, total: 0 };
      byStudent[sid].total++;
      if (['present', 'late'].includes(a.status)) byStudent[sid].present++;
    }
    const students = Object.values(byStudent);
    const chronic = students.filter(s => s.total > 0 && (s.present / s.total) < 0.75).length;
    return { value: pct(chronic, students.length), breakdown: { total: students.length, chronic } };
  },

  async teacher_attendance_pct(schoolId) {
    const att = await prisma.attendance.findMany({
      where: { schoolId, teacherId: { not: null } },
      select: { status: true },
    });
    if (!att.length) return null;
    const present = att.filter(a => ['present', 'late'].includes(a.status)).length;
    return { value: pct(present, att.length) };
  },

  async late_arrival_rate(schoolId, _ay, classId) {
    const where: any = { schoolId, ...(classId ? { classId } : {}) };
    const att = await prisma.attendance.findMany({ where, select: { status: true } });
    if (!att.length) return null;
    const late = att.filter(a => a.status === 'late').length;
    return { value: pct(late, att.length) };
  },

  // ── Teacher Performance ───────────────────────────────────────────────────

  async lesson_completion_rate(schoolId, _ay, classId) {
    const where: any = { schoolId, ...(classId ? { classId } : {}) };
    const items = await (prisma as any).syllabusItem?.findMany?.({ where, select: { isCompleted: true } }) ?? [];
    if (!items.length) return null;
    const done = items.filter((i: any) => i.isCompleted).length;
    return { value: pct(done, items.length), breakdown: { total: items.length, done } };
  },

  async digital_usage_score(schoolId) {
    // Score based on: exams created, homework assigned, attendance marked (in last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const [exams, hw, att] = await Promise.all([
      prisma.exam.count({ where: { schoolId, createdAt: { gte: since } } }),
      prisma.homework.count({ where: { schoolId, createdAt: { gte: since } } }),
      prisma.attendance.count({ where: { schoolId, teacherId: { not: null }, date: { gte: since } } }),
    ]);
    const score = Math.min(100, Math.round(exams * 5 + hw * 3 + att * 2));
    return { value: score, breakdown: { exams, homeworks: hw, attendanceDays: att } };
  },

  async teacher_attendance_consistency(schoolId) {
    return COMPUTERS.teacher_attendance_pct(schoolId, '', null);
  },

  // ── Operational ──────────────────────────────────────────────────────────

  async fee_collection_efficiency(schoolId) {
    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId },
      select: { amount: true, status: true },
    });
    if (!invoices.length) return null;
    const total = invoices.reduce((s, i) => s + Number(i.amount), 0);
    const paid  = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
    return { value: Math.round((paid / total) * 100), breakdown: { totalBilled: total, collected: paid } };
  },

  async complaint_resolution_time(schoolId) {
    const queries = await (prisma as any).studentQuery?.findMany?.({
      where: { schoolId, status: { in: ['resolved', 'closed'] } },
      select: { createdAt: true, updatedAt: true },
    }) ?? [];
    if (!queries.length) return null;
    const avgMs = queries.reduce((s: number, q: any) =>
      s + (new Date(q.updatedAt).getTime() - new Date(q.createdAt).getTime()), 0) / queries.length;
    return { value: Math.round(avgMs / (24 * 3600 * 1000)) };
  },

  async admission_conversion_rate(schoolId) {
    const apps = await prisma.admissionApplication.findMany({
      where: { schoolId },
      select: { status: true },
    });
    if (!apps.length) return null;
    const converted = apps.filter(a => ['enrolled', 'approved'].includes(a.status)).length;
    return { value: pct(converted, apps.length), breakdown: { total: apps.length, converted } };
  },

  // ── Discipline & Behavior ─────────────────────────────────────────────────

  async discipline_incident_count(schoolId) {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const count = await (prisma as any).behaviorIncident?.count?.({
      where: { schoolId, createdAt: { gte: since } },
    }) ?? 0;
    return { value: count };
  },

  async positive_behavior_ratio(schoolId) {
    const incidents = await (prisma as any).behaviorIncident?.findMany?.({
      where: { schoolId },
      select: { type: true },
    }) ?? [];
    if (!incidents.length) return null;
    const positive = incidents.filter((i: any) => i.type === 'positive').length;
    return { value: pct(positive, incidents.length) };
  },

  // ── Co-Curricular ─────────────────────────────────────────────────────────

  async cocurricular_participation_rate(schoolId) {
    const [participants, totalStudents] = await Promise.all([
      (prisma as any).eventParticipant?.findMany?.({ where: { event: { schoolId } }, select: { studentId: true }, distinct: ['studentId'] }) ?? [],
      prisma.student.count({ where: { schoolId, status: 'active' } }),
    ]);
    if (!totalStudents) return null;
    return { value: pct(participants.length, totalStudents), breakdown: { participants: participants.length, totalStudents } };
  },

  async event_engagement_rate(schoolId) {
    const events = await (prisma as any).schoolEvent?.findMany?.({
      where: { schoolId },
      include: { _count: { select: { participants: true } } },
      select: { id: true, _count: true },
    }) ?? [];
    if (!events.length) return null;
    const totalStudents = await prisma.student.count({ where: { schoolId, status: 'active' } });
    if (!totalStudents) return null;
    const avgParticipation = events.reduce((s: number, e: any) => s + (e._count?.participants ?? 0), 0) / events.length;
    return { value: pct(Math.round(avgParticipation), totalStudents) };
  },

  // ── AI Smart KPIs ─────────────────────────────────────────────────────────

  async learning_risk_score(schoolId, _ay, classId) {
    // Average risk score across all students in school/class
    const where: any = { schoolId, status: 'active', ...(classId ? { classId } : {}) };
    const students = await prisma.student.findMany({ where, select: { id: true } });
    if (!students.length) return null;

    const since90 = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    let totalRisk = 0;

    for (const stu of students) {
      const [results, att, hw] = await Promise.all([
        prisma.examResult.findMany({ where: { studentId: stu.id }, select: { marksObtained: true, maxMarks: true } }),
        prisma.attendance.findMany({ where: { schoolId, date: { gte: since90 } }, select: { status: true } }),
        prisma.homeworkSubmission.findMany({ where: { studentId: stu.id }, select: { status: true } }),
      ]);
      const avgPct  = results.length ? pct(results.reduce((s, r) => s + Number(r.marksObtained), 0), results.reduce((s, r) => s + r.maxMarks, 0)) : 50;
      const attPct  = att.length ? pct(att.filter(a => ['present', 'late'].includes(a.status)).length, att.length) : 100;
      const hwPct   = hw.length ? pct(hw.filter(h => ['submitted', 'graded'].includes(h.status)).length, hw.length) : 100;
      // Risk formula: lower marks/att/hw → higher risk
      const risk = Math.round((100 - attPct) * 0.35 + (100 - avgPct) * 0.40 + (100 - hwPct) * 0.25);
      totalRisk += risk;
    }
    return { value: Math.round(totalRisk / students.length) };
  },

  async at_risk_student_count(schoolId, _ay, classId) {
    const where: any = { schoolId, status: 'active', ...(classId ? { classId } : {}) };
    const students = await prisma.student.findMany({ where, select: { id: true } });
    const since90  = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    let atRisk = 0;
    for (const stu of students) {
      const [results, att, hw] = await Promise.all([
        prisma.examResult.findMany({ where: { studentId: stu.id }, select: { marksObtained: true, maxMarks: true } }),
        prisma.attendance.findMany({ where: { schoolId, date: { gte: since90 } }, select: { status: true } }),
        prisma.homeworkSubmission.findMany({ where: { studentId: stu.id }, select: { status: true } }),
      ]);
      const avgPct = results.length ? pct(results.reduce((s, r) => s + Number(r.marksObtained), 0), results.reduce((s, r) => s + r.maxMarks, 0)) : 50;
      const attPct = att.length ? pct(att.filter(a => ['present', 'late'].includes(a.status)).length, att.length) : 100;
      const hwPct  = hw.length ? pct(hw.filter(h => ['submitted', 'graded'].includes(h.status)).length, hw.length) : 100;
      const risk = Math.round((100 - attPct) * 0.35 + (100 - avgPct) * 0.40 + (100 - hwPct) * 0.25);
      if (risk >= 40) atRisk++;
    }
    return { value: atRisk, breakdown: { total: students.length, atRisk } };
  },

  async subject_difficulty_index(schoolId, _ay, classId) {
    const where: any = { exam: { schoolId, ...(classId ? { classId } : {}) } };
    const results = await prisma.examResult.findMany({ where, select: { subject: true, marksObtained: true, maxMarks: true, exam: { select: { passingMarks: true } } } });
    if (!results.length) return null;
    const bySubject: Record<string, { fail: number; total: number }> = {};
    for (const r of results) {
      if (!bySubject[r.subject]) bySubject[r.subject] = { fail: 0, total: 0 };
      bySubject[r.subject].total++;
      const pass = (r.exam as any)?.passingMarks ?? 35;
      if (Number(r.marksObtained) < pass) bySubject[r.subject].fail++;
    }
    const subjects = Object.entries(bySubject).map(([subject, d]) => ({
      subject, failRate: pct(d.fail, d.total),
    })).sort((a, b) => b.failRate - a.failRate);
    const avgFail = Math.round(subjects.reduce((s, x) => s + x.failRate, 0) / subjects.length);
    return { value: avgFail, breakdown: subjects };
  },

  async burnout_indicator(schoolId, _ay, classId) {
    // Students with sudden decline in last 30 days vs previous 30 days
    const now    = new Date();
    const d30    = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const d60    = new Date(Date.now() - 60 * 24 * 3600 * 1000);
    const where: any = { schoolId, status: 'active', ...(classId ? { classId } : {}) };
    const students = await prisma.student.findMany({ where, select: { id: true } });
    let burnout = 0;
    for (const stu of students) {
      const [attNew, attOld] = await Promise.all([
        prisma.attendance.findMany({ where: { schoolId, date: { gte: d30, lte: now } }, select: { status: true } }),
        prisma.attendance.findMany({ where: { schoolId, date: { gte: d60, lt: d30 } }, select: { status: true } }),
      ]);
      const newAtt = attNew.length ? pct(attNew.filter(a => ['present', 'late'].includes(a.status)).length, attNew.length) : 100;
      const oldAtt = attOld.length ? pct(attOld.filter(a => ['present', 'late'].includes(a.status)).length, attOld.length) : 100;
      if (oldAtt - newAtt > 15) burnout++;
    }
    return { value: burnout, breakdown: { total: students.length, burnout } };
  },

  async parent_engagement_risk(schoolId) {
    const since30  = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const parents  = await prisma.parent.findMany({
      where: { parentStudents: { some: { student: { schoolId } } } },
      select: { id: true },
    });
    if (!parents.length) return null;
    const activeQueries = await (prisma as any).studentQuery?.groupBy?.({
      by: ['raisedById'],
      where: { schoolId, createdAt: { gte: since30 } },
    }) ?? [];
    const activeIds = new Set(activeQueries.map((q: any) => q.raisedById));
    const inactive  = parents.filter(p => !activeIds.has(p.id)).length;
    return { value: inactive, breakdown: { total: parents.length, inactive } };
  },
};
