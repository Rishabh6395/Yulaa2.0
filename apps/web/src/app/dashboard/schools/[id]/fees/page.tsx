'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';

const NOTIF_TRIGGERS = [
  { id: 'due_3days', label: '3 days before due date' },
  { id: 'due_1day', label: '1 day before due date' },
  { id: 'on_due', label: 'On due date' },
  { id: 'overdue_3days', label: '3 days after overdue' },
  { id: 'overdue_weekly', label: 'Weekly overdue reminder' },
  { id: 'payment_success', label: 'Payment success confirmation' },
];

export default function FeesConfigPage({ params }: { params: { id: string } }) {
  const { data: feeStructuresData, isLoading: loadingFeeTypes } = useApi<{ names: string[] }>(
    `/api/super-admin/schools/${params.id}/fee-structures`,
  );
  const feeTypes: string[] = feeStructuresData?.names ?? [];

  const [gateway, setGateway] = useState('razorpay');
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [notifTriggers, setNotifTriggers] = useState<string[]>(['due_1day', 'on_due', 'payment_success']);
  const [enabledFeeTypes, setEnabledFeeTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pre-select all fee types once they load
  useEffect(() => {
    if (feeTypes.length > 0 && enabledFeeTypes.length === 0) {
      setEnabledFeeTypes(feeTypes);
    }
  }, [feeTypes]);

  function toggleNotif(id: string) {
    setNotifTriggers(n => n.includes(id) ? n.filter(x => x !== id) : [...n, id]);
  }
  function toggleFeeType(ft: string) {
    setEnabledFeeTypes(n => n.includes(ft) ? n.filter(x => x !== ft) : [...n, ft]);
  }

  async function save() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Fee Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Payment gateway, fee types and notification settings.</p>
      </div>

      {/* Payment Gateway */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Payment Gateway</h2>
        <div className="flex gap-3">
          {['razorpay', 'stripe', 'payu'].map(gw => (
            <button
              key={gw}
              onClick={() => setGateway(gw)}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium capitalize transition-all ${gateway === gw ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400 hover:border-brand-300'}`}
            >
              {gw}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">API Key ID</label>
            <input className="input" type="text" placeholder="rzp_live_xxxx" value={keyId} onChange={e => setKeyId(e.target.value)} />
          </div>
          <div>
            <label className="label">API Key Secret</label>
            <input className="input" type="password" placeholder="••••••••••••••••" value={keySecret} onChange={e => setKeySecret(e.target.value)} />
          </div>
          <div>
            <label className="label">Webhook Secret</label>
            <input className="input" type="password" placeholder="Optional" value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Fee Types */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Enabled Fee Types</h2>
          <span className="text-xs text-surface-400">Sourced from fee structures</span>
        </div>
        {loadingFeeTypes ? (
          <div className="flex flex-wrap gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 w-24 rounded-full bg-surface-100 dark:bg-gray-700 animate-pulse" />
            ))}
          </div>
        ) : feeTypes.length === 0 ? (
          <p className="text-sm text-surface-400">
            No fee types found. Add fee structures for this school first.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {feeTypes.map(ft => (
              <button
                key={ft}
                onClick={() => toggleFeeType(ft)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${enabledFeeTypes.includes(ft) ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400 hover:border-brand-300'}`}
              >
                {ft}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notification Triggers */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Payment Reminder Notifications</h2>
        <div className="space-y-3">
          {NOTIF_TRIGGERS.map(n => (
            <label key={n.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-brand-500"
                checked={notifTriggers.includes(n.id)}
                onChange={() => toggleNotif(n.id)}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{n.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
      </div>
    </div>
  );
}
