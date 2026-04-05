import MasterPage from '@/components/masters/MasterPage';

export default function GenderMasterPage() {
  return (
    <MasterPage
      title="Gender"
      description="Gender options for students and staff"
      apiPath="/api/masters/gender"
      dataKey="genderMasters"
      itemKey="genderMaster"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Male' },
        { key: 'sortOrder', label: 'Sort Order', type: 'number', default: 0 },
      ]}
    />
  );
}
