'use client';

import { useState, useEffect } from 'react';

export default function QueriesPage() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '', priority: 'normal' });
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = () => {
    fetch('/api/queries', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setQueries(d.queries || []); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/queries', { method: 'POST', headers, body: JSON.stringify(form) });
    if (res.ok) {
      setShowAddModal(false);
      setForm({ subject: '', message: '', priority: 'normal' });
      fetchData();
    }
    setSaving(false);
  };

  const statusMap = { open: 'badge-warning', in_progress: 'badge-info', resolved: 'badge-success', closed: 'badge-neutral' };
  const priorityMap = { low: 'text-surface-400', normal: 'text-blue-600', high: 'text-amber-600', urgent: 'text-red-600' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Queries & Support</h1>
          <p className="text-sm text-surface-400 mt-0.5">Communication with school administration</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Query
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-surface-100"/>)}</div>
      ) : queries.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-surface-400">No queries yet.</p></div>
      ) : (
        <div className="space-y-3">
          {queries.map((q) => (
            <div key={q.id} className="card-hover p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">{q.subject}</h3>
                    <span className={statusMap[q.status]}>{q.status.replace('_', ' ')}</span>
                    <span className={`text-[10px] font-bold uppercase ${priorityMap[q.priority]}`}>{q.priority}</span>
                  </div>
                  <p className="text-sm text-surface-400 line-clamp-2">{q.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-surface-400">
                    <span>By {q.raised_by_name}</span>
                    {q.student_name && <span>Re: {q.student_name}</span>}
                    <span>{new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {parseInt(q.reply_count) > 0 && <span className="text-brand-500 font-medium">{q.reply_count} replies</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="card p-6 w-full max-w-lg shadow-modal animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-display font-bold text-gray-900 mb-4">Raise a Query</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="label">Subject *</label>
                <input className="input-field" required value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="What's this about?"/>
              </div>
              <div>
                <label className="label">Message *</label>
                <textarea className="input-field" rows={4} required value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Describe your query in detail..."/>
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input-field" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Submitting...' : 'Submit Query'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
