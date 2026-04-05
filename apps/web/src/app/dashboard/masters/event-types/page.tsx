import MasterPage from '@/components/masters/MasterPage';

export default function EventTypeMasterPage() {
  return (
    <MasterPage
      title="Event Types"
      description="Categories for school events"
      apiPath="/api/masters/event-types"
      dataKey="eventTypeMasters"
      itemKey="eventTypeMaster"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. sports' },
        { key: 'sortOrder', label: 'Sort Order', type: 'number', default: 0 },
      ]}
    />
  );
}
