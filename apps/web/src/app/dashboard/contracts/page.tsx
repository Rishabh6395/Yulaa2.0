'use client';

import { useState, useEffect } from 'react';

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  active:     { label: 'Active',      bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  expired:    { label: 'Expired',     bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500' },
  terminated: { label: 'Terminated',  bg: 'bg-surface-100', text: 'text-surface-600', dot: 'bg-surface-400' },
  pending:    { label: 'Pending',     bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
};

function ContractStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
      {cfg.label}
    </span>
  );
}

function DaysRemainingBar({ daysLeft, status }: { daysLeft: number; status: string }) {
  if (status !== 'active') return null;
  const isExpiring = daysLeft <= 30;
  const isCritical = daysLeft <= 7;
  const barColor = isCritical ? 'bg-red-500' : isExpiring ? 'bg-amber-500' : 'bg-emerald-500';
  // Assume a 365-day contract for the bar width
  const pct = Math.max(0, Math.min(100, (daysLeft / 365) * 100));

  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-surface-400">Contract duration</span>
        <span className={`text-xs font-semibold ${isCritical ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-emerald-600'}`}>
          {daysLeft > 0 ? `${daysLeft} days left` : 'Expires today'}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }}/>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try { setRole(JSON.parse(userData).primaryRole); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!role) return;
    setLoading(true);
    fetch('/api/consultant/contracts', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setContracts(d.contracts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [role, token]);

  const activeContract = contracts.find(c => c.status === 'active');
  const expiredCount   = contracts.filter(c => c.status === 'expired' || c.status === 'terminated').length;
  const isExpiringSoon = activeContract && activeContract.days_remaining <= 30 && activeContract.days_remaining > 0;
  const isConsultant   = role === 'consultant';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">
          {isConsultant ? 'My Contract' : 'Consultant Contracts'}
        </h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
          {isConsultant ? 'Your active and past engagement contracts' : 'All consultant contracts for this school'}
        </p>
      </div>

      {/* Expiry warning banner */}
      {isExpiringSoon && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 flex-shrink-0 mt-0.5">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Contract Expiring Soon</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your contract with <strong>{activeContract.school_name}</strong> expires in{' '}
              <strong>{activeContract.days_remaining} day{activeContract.days_remaining !== 1 ? 's' : ''}</strong>{' '}
              on {new Date(activeContract.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
              Contact the school to renew.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Active Contracts</p>
          <p className="text-2xl font-display font-bold text-emerald-600 mt-1">
            {contracts.filter(c => c.status === 'active').length}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Expired / Closed</p>
          <p className="text-2xl font-display font-bold text-surface-500 mt-1">{expiredCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Total Value</p>
          <p className="text-2xl font-display font-bold text-brand-600 mt-1">
            ₹{contracts.reduce((s, c) => s + parseFloat(c.contract_value || 0), 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Contracts list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="card p-6 h-40 animate-pulse bg-surface-100"/>)}
        </div>
      ) : contracts.length === 0 ? (
        <div className="card p-12 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-surface-300 mb-4">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
          <p className="text-gray-900 dark:text-gray-100 font-semibold">No contracts found</p>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-1">Contact the school administrator to set up your contract.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map(c => {
            const cfg = STATUS_CFG[c.status] || STATUS_CFG.pending;
            const startDate = new Date(c.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const endDate   = new Date(c.end_date).toLocaleDateString('en-IN',   { day: 'numeric', month: 'short', year: 'numeric' });

            return (
              <div key={c.id} className={`card p-6 border-l-4 ${c.status === 'active' ? 'border-l-emerald-400' : 'border-l-surface-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cfg.text}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <p className="text-sm font-display font-bold text-gray-900 dark:text-gray-100">{c.contract_no}</p>
                      <ContractStatusBadge status={c.status} />
                    </div>

                    {/* School or consultant info */}
                    <p className="text-sm font-medium text-gray-700">
                      {isConsultant ? c.school_name : c.consultant_name}
                    </p>
                    {!isConsultant && c.specialization && (
                      <p className="text-xs text-surface-400">{c.specialization}</p>
                    )}

                    {/* Date range + value */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-surface-500">
                      <span className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                        </svg>
                        {startDate} → {endDate}
                      </span>
                      {c.contract_value && (
                        <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                          ₹{parseFloat(c.contract_value).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {c.notes && (
                      <p className="text-xs text-surface-400 mt-2 italic">{c.notes}</p>
                    )}

                    <DaysRemainingBar daysLeft={c.days_remaining} status={c.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
