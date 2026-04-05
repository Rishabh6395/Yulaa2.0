import MasterPage from '@/components/masters/MasterPage';

export default function SchoolHierarchyPage() {
  return (
    <MasterPage
      title="School Hierarchy"
      description="Organisational structure: Trust → Campus → Wing"
      apiPath="/api/masters/school-hierarchy"
      dataKey="schoolHierarchies"
      itemKey="schoolHierarchy"
      fields={[
        { key: 'name',  label: 'Name',  type: 'text',   required: true, placeholder: 'e.g. Primary Wing' },
        { key: 'level', label: 'Level', type: 'number', default: 1 },
      ]}
    />
  );
}
