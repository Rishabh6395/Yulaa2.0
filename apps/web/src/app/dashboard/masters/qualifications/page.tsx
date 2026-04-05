import MasterPage from '@/components/masters/MasterPage';

export default function QualificationMasterPage() {
  return (
    <MasterPage
      title="Qualifications"
      description="Staff qualification types"
      apiPath="/api/masters/qualifications"
      dataKey="qualificationMasters"
      itemKey="qualificationMaster"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. B.Ed.' },
        { key: 'sortOrder', label: 'Sort Order', type: 'number', default: 0 },
      ]}
    />
  );
}
