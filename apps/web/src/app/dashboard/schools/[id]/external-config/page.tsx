'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Config = {
  id: string;
  name: string;
  allowExternalConsultant: boolean;
  allowExternalVendor: boolean;
};

export default function ExternalConfigPage() {
  const params   = useParams<{ id: string }>();
  const schoolId = params.id;

  const [config,  setConfig]  = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/super-admin/schools/${schoolId}/external-config`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setConfig(d.config ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [schoolId]);

  const toggle = (field: 'allowExternalConsultant' | 'allowExternalVendor') => {
    if (!config) return;
    setConfig(prev => prev ? { ...prev, [field]: !prev[field] } : prev);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/external-config`, {
        method: 'PATCH', headers,
        body: JSON.stringify({
          allow_external_consultant: config.allowExternalConsultant,
          allow_external_vendor:     config.allowExternalVendor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig(data.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  if (loading) return <div className="card p-8 text-center text-sm text-surface-400">Loading configuration…</div>;
  if (!config) return <div className="card p-8 text-center text-sm text-red-500">Failed to load configuration.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">External Services Config</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          Control whether <strong>{config.name}</strong> can use external career consultants and vendors from the platform marketplace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Career Consultants */}
        <div className="card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                External Career Consultants
              </h2>
              <p className="text-sm text-surface-400 mt-1">
                When enabled, parents in this school can browse and book sessions with external career consultants registered on the platform.
              </p>
            </div>
            <button
              onClick={() => toggle('allowExternalConsultant')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${config.allowExternalConsultant ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.allowExternalConsultant ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className={`text-xs font-medium px-2 py-1 rounded-md w-fit ${config.allowExternalConsultant ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
            {config.allowExternalConsultant ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        {/* Vendor / Marketplace */}
        <div className="card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                External Vendor Marketplace
              </h2>
              <p className="text-sm text-surface-400 mt-1">
                When enabled, parents in this school can browse and order from external vendors registered on the platform (books, uniforms, stationery etc.).
              </p>
            </div>
            <button
              onClick={() => toggle('allowExternalVendor')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${config.allowExternalVendor ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.allowExternalVendor ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className={`text-xs font-medium px-2 py-1 rounded-md w-fit ${config.allowExternalVendor ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
            {config.allowExternalVendor ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Area scope</strong> for external consultants and vendors is controlled at the platform level by the super admin. Individual area restrictions (city / state / national) are set on each consultant or vendor profile.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
            Saved!
          </span>
        )}
      </div>
    </div>
  );
}
