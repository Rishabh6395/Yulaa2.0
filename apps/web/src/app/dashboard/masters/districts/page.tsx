import DistrictsClient from './DistrictsClient';

export default function DistrictsPage({ searchParams }: { searchParams: { schoolId?: string } }) {
  return <DistrictsClient schoolId={searchParams.schoolId ?? ''} />;
}
