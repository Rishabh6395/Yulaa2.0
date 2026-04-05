import MasterPage from '@/components/masters/MasterPage';

export default function CountryMasterPage() {
  return (
    <MasterPage
      title="Countries"
      description="Country list for address fields"
      apiPath="/api/masters/countries"
      dataKey="countries"
      itemKey="country"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. IND' },
        { key: 'sortOrder', label: 'Sort Order', type: 'number', default: 0 },
      ]}
    />
  );
}
