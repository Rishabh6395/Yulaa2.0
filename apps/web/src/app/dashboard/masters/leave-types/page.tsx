import MasterPage from '@/components/masters/MasterPage';

export default function LeaveTypeMasterPage() {
  return (
    <MasterPage
      title="Leave Types"
      description="Leave categories for staff"
      apiPath="/api/masters/leave-types"
      dataKey="leaveTypes"
      itemKey="leaveType"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. casual' },
        {
          key: 'applicableTo',
          label: 'Applicable To',
          type: 'multiselect',
          options: ['teacher', 'employee', 'parent'],
          default: [],
        },
      ]}
    />
  );
}
