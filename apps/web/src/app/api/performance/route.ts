import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function scoreToGrade(pct: number) {
  return pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
}

// AI risk score: higher = more at risk (0-100)
function riskScore(attPct: number, avgPct: number, hwPct: number) {
  return Math.round((100 - attPct) * 0.35 + (100 - avgPct) * 0.40 + (100 - hwPct) * 0.25);
}

function riskLabel(score: number): 'low' | 'medium' | 'high' {
  return score <= 30 ? 'low' : score <= 60 ? 'medium' : 'high';
}

function getPrimarySchoolId(user: any, overrideSchoolId?: string | null): string {
  const isSuperAdmin = user.roles.some((r: any) => r.role_code === 'super_admin');
  if (isSuperAdmin && overrideSchoolId) return overrideSchoolId;
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary?.school_id) return primary.school_id;
  throw new AppError('No school associated with your account', 400);
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(request.url);
    const view      = searchParams.get('view') ?? 'admin';
    const classId   = searchParams.get('class_id') ?? undefined;
    const examId    = searchParams.get('exam_id') ?? undefined;
    const studentId = searchParams.get('student_id') ?? undefined;
    const schoolIdParam = searchParams.get('school_id');

    const primaryRole = (user.roles.find((r: any) => r.is_primary) ?? user.roles[0])?.role_code;
    const isSuperAdmin = primaryRole === 'super_admin';
    const isAdmin      = ['school_admin', 'principal', 'hod'].includes(primaryRole);
    const isTeacher    = primaryRole === 'teacher';
    const isParent     = primaryRole === 'parent';

    // ── Super admin: school list or drill-in ─────────────────────────────────
    if (view === 'super_admin') {
      if (!isSuperAdmin) throw new ForbiddenError();

      if (schoolIdParam) {
        // Drill into a specific school — same as admin view
        return adminView(schoolIdParam, classId, examId);
      }

      // Top-level: all schools summary
      const schools = await prisma.school.findMany({
        include: { _count: { select: { students: true, teachers: true } } },
        orderBy: { name: 'asc' },
      });

      const summaries = await Promise.all(schools.map(async (sch) => {
        const [exams, students] = await Promise.all([
          prisma.exam.count({ where: { schoolId: sch.id } }),
          prisma.examResult.aggregate({
            where: { exam: { schoolId: sch.id } },
            _avg: { marksObtained: true },
            _count: true,
          }),
        ]);
        const avgMark   = students._avg.marksObtained ?? 0;
        return {
          id:            sch.id,
          name:          sch.name,
          totalStudents: sch._count.students,
          totalTeachers: sch._count.teachers,
          totalExams:    exams,
          avgScore:      Math.round(Number(avgMark)),
          resultCount:   students._count,
        };
      }));

      return Response.json({ view: 'super_admin', schools: summaries });
    }

    // ── Admin / Principal view ────────────────────────────────────────────────
    if (view === 'admin') {
      if (!isAdmin && !isSuperAdmin) throw new ForbiddenError();
      const schoolId = getPrimarySchoolId(user, schoolIdParam);
      return adminView(schoolId, classId, examId);
    }

    // ── Teacher view ──────────────────────────────────────────────────────────
    if (view === 'teacher') {
      if (!isTeacher && !isAdmin && !isSuperAdmin) throw new ForbiddenError();
      const schoolId = getPrimarySchoolId(user, null);

      // Get teacher record
      const teacher = await prisma.teacher.findFirst({
        where: { userId: user.id, schoolId },
      });
      if (!teacher) throw new AppError('Teacher record not found');

      // Exams for selector
      const exams = await prisma.exam.findMany({
        where: { schoolId, ...(classId ? { classId } : {}) },
        orderBy: { startDate: 'desc' },
        take: 20,
      });

      const targetExamId = examId ?? exams[0]?.id;
      if (!targetExamId) {
        return Response.json({ view: 'teacher', exams, students: [], subjects: [], classInfo: null });
      }

      const exam = await prisma.exam.findFirst({
        where: { id: targetExamId, schoolId },
        include: { entries: true },
      });
      if (!exam) throw new AppError('Exam not found');

      const targetClassId = classId ?? exam.classId;
      if (!targetClassId) {
        return Response.json({ view: 'teacher', exams, exam, students: [], subjects: [], classInfo: null });
      }

      const classInfo = await prisma.class.findUnique({ where: { id: targetClassId } });

      // Students in class
      const students = await prisma.student.findMany({
        where: { classId: targetClassId, schoolId, status: 'active' },
        orderBy: { firstName: 'asc' },
      });

      // Subjects from exam timetable
      const entries  = exam.entries.filter(e => e.classId === targetClassId);
      const subjects = [...new Set(entries.map(e => e.subject))];

      // Results for all students in this exam
      const results = await prisma.examResult.findMany({
        where: { examId: targetExamId, studentId: { in: students.map(s => s.id) } },
      });

      // Attendance for current month
      const now  = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const attendanceRaw = await prisma.attendance.findMany({
        where: { studentId: { in: students.map(s => s.id) }, date: { gte: from } },
        select: { studentId: true, status: true },
      });

      // Homework completion
      const homeworkRaw = await prisma.homeworkSubmission.findMany({
        where: {
          studentId: { in: students.map(s => s.id) },
          homework: { schoolId },
        },
        select: { studentId: true, status: true },
      });

      // Build per-student data
      const studentsData = students.map(s => {
        const sResults  = results.filter(r => r.studentId === s.id);
        const sAttendance = attendanceRaw.filter(a => a.studentId === s.id);
        const sHomework   = homeworkRaw.filter(h => h.studentId === s.id);

        const subjectScores: Record<string, { marks: number; max: number; pct: number }> = {};
        for (const sub of subjects) {
          const r = sResults.find(r => r.subject === sub);
          const entry = entries.find(e => e.subject === sub);
          if (r) {
            const max = entry?.maxMarks ?? Number(r.maxMarks);
            const pct = Math.round((Number(r.marksObtained) / max) * 100);
            subjectScores[sub] = { marks: Number(r.marksObtained), max, pct };
          }
        }

        const scoredSubjects = Object.values(subjectScores);
        const avgPct  = scoredSubjects.length
          ? Math.round(scoredSubjects.reduce((a, x) => a + x.pct, 0) / scoredSubjects.length)
          : 0;

        const totalAtt = sAttendance.length;
        const presentAtt = sAttendance.filter(a => ['present','late'].includes(a.status)).length;
        const attPct  = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

        const totalHw = sHomework.length;
        const doneHw  = sHomework.filter(h => ['submitted','graded'].includes(h.status)).length;
        const hwPct   = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 100;

        const risk = riskScore(attPct, avgPct, hwPct);

        return {
          id:            s.id,
          firstName:     s.firstName,
          lastName:      s.lastName,
          admissionNo:   s.admissionNo,
          subjectScores,
          avgPct,
          grade:         scoreToGrade(avgPct),
          attPct,
          hwPct,
          riskScore:     risk,
          riskLevel:     riskLabel(risk),
          resultsEntered: sResults.length,
        };
      });

      // Class-level stats
      const withResults = studentsData.filter(s => s.resultsEntered > 0);
      const classAvg    = withResults.length
        ? Math.round(withResults.reduce((a, s) => a + s.avgPct, 0) / withResults.length)
        : 0;
      const topPerformers = [...studentsData].sort((a, b) => b.avgPct - a.avgPct).slice(0, 5);
      const atRisk        = studentsData.filter(s => s.riskLevel === 'high');

      // Subject averages
      const subjectAvgs = subjects.map(sub => {
        const subScores = studentsData.map(s => s.subjectScores[sub]?.pct ?? null).filter(x => x !== null) as number[];
        const avg = subScores.length ? Math.round(subScores.reduce((a, b) => a + b, 0) / subScores.length) : 0;
        return { subject: sub, avg, count: subScores.length };
      }).sort((a, b) => a.avg - b.avg);

      return Response.json({
        view:       'teacher',
        exams,
        exam:       { ...exam, entries },
        classInfo,
        subjects,
        students:   studentsData,
        classStats: { avg: classAvg, total: students.length, withResults: withResults.length, atRisk: atRisk.length, topCount: topPerformers.length },
        topPerformers,
        atRisk,
        subjectAvgs,
      });
    }

    // ── Parent / Student view ─────────────────────────────────────────────────
    if (view === 'parent' || view === 'student') {
      const targetStudentId = studentId;
      if (!targetStudentId) throw new AppError('student_id required');

      // Security: parent can only see their own children
      if (isParent) {
        const parentRecord = await prisma.parent.findFirst({ where: { userId: user.id } });
        if (!parentRecord) throw new ForbiddenError();
        const link = await prisma.parentStudent.findFirst({
          where: { parentId: parentRecord.id, studentId: targetStudentId },
        });
        if (!link) throw new ForbiddenError();
      }

      const student = await prisma.student.findUnique({
        where: { id: targetStudentId },
        include: { class: true },
      });
      if (!student) throw new AppError('Student not found');

      // Ensure school isolation
      const schoolId = getPrimarySchoolId(user, null);
      if (!isSuperAdmin && student.schoolId !== schoolId) throw new ForbiddenError();

      // All exams for the student's school
      const exams = await prisma.exam.findMany({
        where: { schoolId: student.schoolId, classId: student.classId ?? undefined },
        orderBy: { startDate: 'desc' },
        take: 10,
      });

      // All results for this student
      const results = await prisma.examResult.findMany({
        where: { studentId: targetStudentId, exam: { schoolId: student.schoolId } },
        include: { exam: { select: { title: true, examType: true, startDate: true } } },
        orderBy: { createdAt: 'desc' },
      });

      // Group by exam
      const byExam = exams.map(exam => {
        const examResults = results.filter(r => r.examId === exam.id);
        const subjects    = examResults.map(r => ({
          subject: r.subject,
          marks:   Number(r.marksObtained),
          max:     Number(r.maxMarks),
          pct:     Math.round((Number(r.marksObtained) / Number(r.maxMarks)) * 100),
          grade:   r.grade ?? scoreToGrade(Math.round((Number(r.marksObtained) / Number(r.maxMarks)) * 100)),
        }));
        const avg = subjects.length
          ? Math.round(subjects.reduce((a, s) => a + s.pct, 0) / subjects.length)
          : 0;
        return { examId: exam.id, examTitle: exam.title, examType: exam.examType, date: exam.startDate, subjects, avg, grade: scoreToGrade(avg) };
      }).filter(e => e.subjects.length > 0);

      // Attendance last 3 months
      const attFrom = new Date(); attFrom.setMonth(attFrom.getMonth() - 3);
      const attendance = await prisma.attendance.findMany({
        where: { studentId: targetStudentId, date: { gte: attFrom } },
        select: { date: true, status: true },
        orderBy: { date: 'asc' },
      });
      const totalAtt   = attendance.length;
      const presentAtt = attendance.filter(a => ['present','late'].includes(a.status)).length;
      const attPct     = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

      // Homework completion
      const hwSubs = await prisma.homeworkSubmission.findMany({
        where: { studentId: targetStudentId, homework: { schoolId: student.schoolId } },
        select: { status: true },
      });
      const hwPct = hwSubs.length > 0
        ? Math.round(hwSubs.filter(h => ['submitted','graded'].includes(h.status)).length / hwSubs.length * 100)
        : 100;

      // Latest exam stats
      const latestExam = byExam[0];
      const avgPct     = latestExam?.avg ?? 0;
      const risk       = riskScore(attPct, avgPct, hwPct);

      // Best/weak subject across all exams
      const allSubjectPcts: Record<string, number[]> = {};
      for (const e of byExam) {
        for (const s of e.subjects) {
          if (!allSubjectPcts[s.subject]) allSubjectPcts[s.subject] = [];
          allSubjectPcts[s.subject].push(s.pct);
        }
      }
      const subjectSummary = Object.entries(allSubjectPcts).map(([subject, pcts]) => ({
        subject,
        avg: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      })).sort((a, b) => b.avg - a.avg);

      // AI recommendation
      const weakSubject = subjectSummary.at(-1)?.subject ?? '';
      const aiRemark = generateRemark(student.firstName, avgPct, attPct, hwPct, weakSubject);

      return Response.json({
        view:      'parent',
        student:   { id: student.id, firstName: student.firstName, lastName: student.lastName, admissionNo: student.admissionNo, class: student.class },
        byExam,
        subjectSummary,
        attendance:    { total: totalAtt, present: presentAtt, pct: attPct },
        homework:      { total: hwSubs.length, done: hwSubs.filter(h => ['submitted','graded'].includes(h.status)).length, pct: hwPct },
        riskScore:     risk,
        riskLevel:     riskLabel(risk),
        aiRemark,
      });
    }

    throw new AppError('Unknown view');
  } catch (err) { return handleError(err); }
}

// ── Admin view helper ─────────────────────────────────────────────────────────

async function adminView(schoolId: string, classId?: string, examId?: string) {
  const [exams, classes] = await Promise.all([
    prisma.exam.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
      take: 20,
      include: { _count: { select: { results: true } } },
    }),
    prisma.class.findMany({
      where: { schoolId },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
      include: { _count: { select: { students: true } } },
    }),
  ]);

  const targetExamId  = examId ?? exams[0]?.id;
  const targetClassId = classId;

  if (!targetExamId) {
    return Response.json({ view: 'admin', exams, classes, classStats: [], subjectAvgs: [], topPerformers: [], atRisk: [] });
  }

  // Results for chosen exam (optionally filtered by class)
  const resultsWhere: any = { exam: { schoolId, id: targetExamId } };
  if (targetClassId) resultsWhere.student = { classId: targetClassId };

  const results = await prisma.examResult.findMany({
    where: resultsWhere,
    include: {
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, classId: true } },
    },
  });

  // Group by student
  const byStudent: Record<string, { student: any; scores: { subject: string; pct: number }[] }> = {};
  for (const r of results) {
    if (!byStudent[r.studentId]) byStudent[r.studentId] = { student: r.student, scores: [] };
    const pct = Math.round((Number(r.marksObtained) / Number(r.maxMarks)) * 100);
    byStudent[r.studentId].scores.push({ subject: r.subject, pct });
  }

  // Per-class summary
  const classMap: Record<string, { total: number; sum: number; count: number }> = {};
  for (const { student, scores } of Object.values(byStudent)) {
    const cid = student.classId ?? 'unknown';
    if (!classMap[cid]) classMap[cid] = { total: 0, sum: 0, count: 0 };
    const avg = scores.length ? Math.round(scores.reduce((a, s) => a + s.pct, 0) / scores.length) : 0;
    classMap[cid].total++;
    classMap[cid].sum += avg;
    classMap[cid].count++;
  }
  const classStats = classes.map(c => ({
    id: c.id, grade: c.grade, section: c.section,
    students: c._count.students,
    avg: classMap[c.id] ? Math.round(classMap[c.id].sum / classMap[c.id].count) : null,
    resultsCount: classMap[c.id]?.total ?? 0,
  }));

  // Subject averages across school
  const subjectMap: Record<string, number[]> = {};
  for (const r of results) {
    const pct = Math.round((Number(r.marksObtained) / Number(r.maxMarks)) * 100);
    if (!subjectMap[r.subject]) subjectMap[r.subject] = [];
    subjectMap[r.subject].push(pct);
  }
  const subjectAvgs = Object.entries(subjectMap).map(([subject, pcts]) => ({
    subject,
    avg: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
    count: pcts.length,
  })).sort((a, b) => a.avg - b.avg);

  // Top performers & at-risk
  const allStudents = Object.values(byStudent).map(({ student, scores }) => {
    const avg = scores.length ? Math.round(scores.reduce((a, s) => a + s.pct, 0) / scores.length) : 0;
    return { ...student, avg, grade: scoreToGrade(avg) };
  });
  const topPerformers = [...allStudents].sort((a, b) => b.avg - a.avg).slice(0, 10);
  const atRisk        = allStudents.filter(s => s.avg < 50).sort((a, b) => a.avg - b.avg).slice(0, 10);

  return Response.json({
    view: 'admin',
    exams,
    classes,
    classStats,
    subjectAvgs,
    topPerformers,
    atRisk,
    totalResults: results.length,
    examSelected: exams.find(e => e.id === targetExamId),
  });
}

// ── AI remark generator (rule-based) ─────────────────────────────────────────

function generateRemark(name: string, avgPct: number, attPct: number, hwPct: number, weakSubject: string): string {
  const parts: string[] = [];

  if (avgPct >= 85) parts.push(`${name} is performing excellently overall.`);
  else if (avgPct >= 70) parts.push(`${name} is performing well with room for further improvement.`);
  else if (avgPct >= 50) parts.push(`${name} is performing satisfactorily but needs to focus more.`);
  else parts.push(`${name} needs immediate academic attention.`);

  if (attPct < 75) parts.push(`Attendance is critically low at ${attPct}% — regular presence is essential.`);
  else if (attPct < 85) parts.push(`Attendance at ${attPct}% could be better; consistency helps scores.`);

  if (hwPct < 60) parts.push(`Homework completion rate of ${hwPct}% is concerning — completing assignments regularly improves retention.`);

  if (weakSubject) parts.push(`Focus on ${weakSubject} as it shows the lowest scores.`);

  return parts.join(' ');
}
