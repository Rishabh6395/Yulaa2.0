import StatesClient from './StatesClient';

export default function StatesPage({ searchParams }: { searchParams: { schoolId?: string } }) {
  return <StatesClient schoolId={searchParams.schoolId ?? ''} />;
}
