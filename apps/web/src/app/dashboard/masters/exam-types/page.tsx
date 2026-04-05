import MasterPage from '@/components/masters/MasterPage';

export default function ExamTypeMasterPage() {
  return (
    <MasterPage
      title="Exam Types"
      description="Types of exams and terms"
      apiPath="/api/masters/exam-types"
      dataKey="examTypes"
      itemKey="examType"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. ut1' },
        { key: 'termOrder', label: 'Term Order', type: 'number', default: 1 },
      ]}
    />
  );
}
