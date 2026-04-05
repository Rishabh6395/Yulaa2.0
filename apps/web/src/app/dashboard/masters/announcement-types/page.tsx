import MasterPage from '@/components/masters/MasterPage';

export default function AnnouncementTypeMasterPage() {
  return (
    <MasterPage
      title="Announcement Types"
      description="Categories for announcements"
      apiPath="/api/masters/announcement-types"
      dataKey="announcementTypes"
      itemKey="announcementType"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. academic' },
      ]}
    />
  );
}
