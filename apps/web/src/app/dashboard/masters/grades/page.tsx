import MasterPage from '@/components/masters/MasterPage';

export default function GradeMasterPage() {
  return (
    <MasterPage
      title="Grades"
      description="Grade / class levels used across admission, student, and other forms"
      apiPath="/api/masters/grades"
      dataKey="gradeMasters"
      itemKey="gradeMaster"
      fields={[
        { key: 'name', label: 'Grade Name', type: 'text', required: true, placeholder: 'e.g. Grade 1, LKG, Nursery' },
        { key: 'sortOrder', label: 'Sort Order', type: 'number', default: 0 },
      ]}
    />
  );
}
