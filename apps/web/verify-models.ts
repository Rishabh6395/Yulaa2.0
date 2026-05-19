import prisma from './src/lib/prisma';
async function main() {
  const SCHOOL_ID = '10000000-0000-0000-0000-000000000001';
  
  // Test GradingScheme
  const gs = await prisma.gradingScheme.upsert({
    where: { schoolId_gradeLevel_label: { schoolId: SCHOOL_ID, gradeLevel: 'all', label: 'A+' } },
    create: { schoolId: SCHOOL_ID, gradeLevel: 'all', label: 'A+', minPct: 90, maxPct: 100, gpaPoints: 10, remark: 'Outstanding', createdById: 'system' },
    update: { minPct: 90, maxPct: 100 }
  });
  console.log('GradingScheme OK:', gs.label, gs.minPct + '-' + gs.maxPct + '%');

  // Test SubjectCatalog
  const sc = await prisma.subjectCatalog.upsert({
    where: { schoolId_gradeLevel_subject: { schoolId: SCHOOL_ID, gradeLevel: '10', subject: 'Mathematics' } },
    create: { schoolId: SCHOOL_ID, gradeLevel: '10', subject: 'Mathematics', code: 'MATH10', isCore: true, maxMarks: 100, passMarks: 33, createdById: 'system' },
    update: { code: 'MATH10' }
  });
  console.log('SubjectCatalog OK:', sc.subject, 'Grade:', sc.gradeLevel);

  // Test PerformanceTemplate
  const pt = await prisma.performanceTemplate.create({
    data: { name: 'Test Quarterly', cycleType: 'quarterly', weightAcademic: 40, weightAttendance: 30, weightBehavior: 20, weightEco: 10, reportCardTemplate: 'standard', createdById: 'system' }
  });
  console.log('PerformanceTemplate OK:', pt.name, pt.cycleType);
  await prisma.performanceTemplate.delete({ where: { id: pt.id } });

  await prisma.$disconnect();
  console.log('All new models work correctly!');
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
