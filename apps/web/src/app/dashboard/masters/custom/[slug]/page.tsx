'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import MasterPage from '@/components/masters/MasterPage';

export default function CustomMasterPage() {
  const { slug }      = useParams<{ slug: string }>();
  const searchParams  = useSearchParams();
  const schoolIdParam = searchParams.get('schoolId') ?? undefined;

  const [masterType, setMasterType] = useState<{ name: string; description?: string } | null>(null);
  const [notFound, setNotFound]     = useState(false);

  useEffect(() => {
    const token  = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='))?.split('=')[1] ?? '';
    const suffix = schoolIdParam ? `?schoolId=${schoolIdParam}&includeInactive=true` : '?includeInactive=true';
    fetch(`/api/masters/custom/${slug}${suffix}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.masterType) setMasterType(d.masterType);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [slug, schoolIdParam]);

  if (notFound) {
    return (
      <div className="card p-12 text-center">
        <p className="text-surface-400">Master type not found.</p>
      </div>
    );
  }

  if (!masterType) {
    return <div className="card p-8 text-center text-sm text-surface-400">Loading…</div>;
  }

  return (
    <MasterPage
      title={masterType.name}
      description={masterType.description || `Manage ${masterType.name} values`}
      apiPath={`/api/masters/custom/${slug}`}
      dataKey="masterValues"
      itemKey="masterValue"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Enter value' },
        { key: 'sortOrder', label: 'Sort Order', type: 'number', default: 0 },
      ]}
    />
  );
}
