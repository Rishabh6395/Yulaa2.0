'use client';

import { useState, useEffect } from 'react';

const typeConfig: Record<string, { bg: string; text: string; icon: string }> = {
  general: { bg: 'bg-surface-100', text: 'text-surface-600', icon: '📢' },
  urgent: { bg: 'bg-red-50', text: 'text-red-700', icon: '🚨' },
  event: { bg: 'bg-blue-50', text: 'text-blue-700', icon: '🎉' },
  holiday: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '🏖️' },
  exam: { bg: 'bg-purple-50', text: 'text-purple-700', icon: '📝' },
  fee_reminder: { bg: 'bg-amber-50', text: 'text-amber-700', icon: '💰' },
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'general', audience: 'all' });
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const isAdmin = ['school_admin', 'super_admin'].includes(user.primaryRole);

  const fetchData = () => {
    fetch('/api/announcements', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setAnnouncements(d.announcements || []); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/announcements', { method: 'POST', headers, body: JSON.stringify(form) });
    if (res.ok) {
      setShowAddModal(false);
      setForm({ title: '', message: '', type: 'general', audience: 'all' });
      fetchData();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-surface-400 mt-0.5">School-wide communications</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Announcement
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="card p-5 h-24 animate-pulse bg-surface-100"/>)}</div>
      ) : announcements.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-surface-400">No announcements yet.</p></div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const config = typeConfig[a.type] || typeConfig.general;
            return (
              <div key={a.id} className={`card p-5 border-l-4 ${a.type === 'urgent' ? 'border-l-red-500' : a.type === 'event' ? 'border-l-blue-500' : 'border-l-surface-300'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center text-lg flex-shrink-0`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${config.bg} ${config.text}`}>{a.type.replace('_', ' ')}</span>
                      <span className="badge-neutral text-[10px]">{a.audience}</span>
                    </div>
                    <p className="text-sm text-surface-500 leading-relaxed">{a.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-surface-400">
                      <span>{new Date(a.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {a.created_by_name && <span>by {a.created_by_name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="card p-6 w-full max-w-lg shadow-modal animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-display font-bold text-gray-900 mb-4">New Announcement</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="label">Title *</label>
                <input className="input-field" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Announcement title"/>
              </div>
              <div>
                <label className="label">Message *</label>
                <textarea className="input-field" rows={4} required value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Write your announcement..."/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select className="input-field" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="general">General</option>
                    <option value="urgent">Urgent</option>
                    <option value="event">Event</option>
                    <option value="holiday">Holiday</option>
                    <option value="exam">Exam</option>
                    <option value="fee_reminder">Fee Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="label">Audience</label>
                  <select className="input-field" value={form.audience} onChange={e => setForm({...form, audience: e.target.value})}>
                    <option value="all">All</option>
                    <option value="parents">Parents</option>
                    <option value="teachers">Teachers</option>
                    <option value="students">Students</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Publishing...' : 'Publish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
