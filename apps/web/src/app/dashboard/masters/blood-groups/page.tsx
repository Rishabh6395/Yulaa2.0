import MasterPage from '@/components/masters/MasterPage';

export default function BloodGroupMasterPage() {
  return (
    <MasterPage
      title="Blood Groups"
      description="Blood group options"
      apiPath="/api/masters/blood-groups"
      dataKey="bloodGroupMasters"
      itemKey="bloodGroupMaster"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. A+' },
        { key: 'sortOrder', label: 'Sort Order', type: 'number', default: 0 },
      ]}
    />
  );
}
