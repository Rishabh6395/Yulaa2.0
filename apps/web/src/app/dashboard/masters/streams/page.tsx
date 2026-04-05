import MasterPage from '@/components/masters/MasterPage';

export default function StreamMasterPage() {
  return (
    <MasterPage
      title="Streams"
      description="Academic streams available"
      apiPath="/api/masters/streams"
      dataKey="streamMasters"
      itemKey="streamMaster"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Science' },
        { key: 'sortOrder', label: 'Sort Order', type: 'number', default: 0 },
      ]}
    />
  );
}
