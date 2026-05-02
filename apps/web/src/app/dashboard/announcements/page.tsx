'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/ui/Modal';
import StarsCard from '@/components/ui/StarsCard';
import PageError from '@/components/ui/PageError';
import { useApi } from '@/hooks/useApi';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CFG: Record<string, { glow: string; badge: string; icon: string; border: string }> = {
  general:     { glow: 'rgba(99,102,241,0.18)',  badge: 'bg-indigo-100/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',   icon: '📢', border: 'border-indigo-400/30' },
  urgent:      { glow: 'rgba(239,68,68,0.20)',   badge: 'bg-red-100/80    dark:bg-red-950/40    text-red-700    dark:text-red-400',      icon: '🚨', border: 'border-red-400/40' },
  event:       { glow: 'rgba(59,130,246,0.18)',  badge: 'bg-blue-100/80   dark:bg-blue-950/40   text-blue-700   dark:text-blue-400',    icon: '🎉', border: 'border-blue-400/30' },
  holiday:     { glow: 'rgba(16,185,129,0.18)',  badge: 'bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400', icon: '🏖️', border: 'border-emerald-400/30' },
  exam:        { glow: 'rgba(168,85,247,0.20)',  badge: 'bg-purple-100/80 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400',  icon: '📝', border: 'border-purple-400/30' },
  fee_reminder:{ glow: 'rgba(245,158,11,0.18)',  badge: 'bg-amber-100/80  dark:bg-amber-950/40  text-amber-700  dark:text-amber-400',   icon: '💰', border: 'border-amber-400/30' },
};

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}

function daysLeft(date: string) {
  const diff = 20 - Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  return Math.max(0, diff);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const [showAddModal,     setShowAddModal]     = useState(false);
  const [form, setForm]                         = useState({ title: '', message: '', type: 'general', audience: 'all' });
  const [saving,           setSaving]           = useState(false);
  const [saveError,        setSaveError]        = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [deleting,         setDeleting]         = useState<string | null>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const user    = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const isAdmin      = ['school_admin', 'super_admin'].includes(user.primaryRole);
  const isSuperAdmin = user.primaryRole === 'super_admin';

  const { data: schoolsData } = useApi<{ schools: { id: string; name: string }[] }>(
    isSuperAdmin ? '/api/super-admin/schools' : null,
  );
  const schools = schoolsData?.schools ?? [];

  const listUrl = isSuperAdmin && selectedSchoolId
    ? `/api/announcements?schoolId=${selectedSchoolId}`
    : '/api/announcements';

  const { data, isLoading, error, mutate } = useApi<{ announcements: any[] }>(listUrl);
  // Filter out announcements older than 20 days (client-side expiry)
  const announcements = (data?.announcements ?? []).filter(a => {
    const ageDays = Math.floor((Date.now() - new Date(a.published_at).getTime()) / 86400000);
    return ageDays < 20;
  });

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true); setSaveError('');
    const payload: any = { ...form };
    if (isSuperAdmin && selectedSchoolId) payload.schoolId = selectedSchoolId;
    const res  = await fetch('/api/announcements', { method: 'POST', headers, body: JSON.stringify(payload) });
    const body = await res.json();
    if (res.ok) {
      setShowAddModal(false);
      setForm({ title: '', message: '', type: 'general', audience: 'all' });
      mutate();
    } else {
      setSaveError(body.error || 'Failed to publish');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch('/api/announcements', { method: 'DELETE', headers, body: JSON.stringify({ id }) });
    mutate();
    setDeleting(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Announcements</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">School-wide communications · auto-expire after 20 days</p>
        </div>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setSaveError(''); setShowAddModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Announcement
          </motion.button>
        )}
      </div>

      {/* Super admin school picker */}
      {isSuperAdmin && schools.length > 0 && (
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-400 shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <select className="input text-sm max-w-xs" value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)}>
            <option value="">Default school</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* List */}
      {error ? (
        <PageError message="Failed to load announcements — please try again." onRetry={() => mutate()} />
      ) : isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-2xl border border-surface-100 dark:border-gray-700/50 p-5 h-24 animate-pulse bg-surface-50 dark:bg-gray-800/40" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <StarsCard className="p-12 text-center" glowColor="rgba(99,102,241,0.12)">
          <div className="text-4xl mb-3">📢</div>
          <p className="text-surface-400 dark:text-gray-500 text-sm">No announcements yet. Publish one above.</p>
        </StarsCard>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {announcements.map((a, idx) => {
              const cfg     = TYPE_CFG[a.type] || TYPE_CFG.general;
              const left    = daysLeft(a.published_at);
              const isNew   = left >= 18;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1,  y: 0 }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.22 } }}
                  transition={{ delay: idx * 0.04, duration: 0.28 }}
                >
                  <StarsCard glowColor={cfg.glow} className={`p-5 border-l-4 ${cfg.border}`}>
                    <div className="flex items-start gap-4">
                      <div className="text-2xl flex-shrink-0 mt-0.5">{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{a.title}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${cfg.badge}`}>
                            {(a.type ?? '').replace('_', ' ')}
                          </span>
                          {isNew && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 animate-pulse">
                              NEW
                            </span>
                          )}
                          {(a.target_roles ?? []).map((r: string) => (
                            <span key={r} className="text-[10px] bg-surface-100 dark:bg-gray-700/60 text-surface-400 dark:text-gray-500 px-1.5 py-0.5 rounded capitalize">{r}</span>
                          ))}
                        </div>
                        <p className="text-sm text-surface-500 dark:text-gray-400 leading-relaxed">{a.message}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-surface-400 dark:text-gray-500">
                          <span>{timeAgo(a.published_at)}</span>
                          {a.created_by_name && <span>· {a.created_by_name}</span>}
                          {left <= 5 && left > 0 && (
                            <span className="text-amber-500 dark:text-amber-400 font-medium">· expires in {left}d</span>
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
                      {isAdmin && (
                        <motion.button
                          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(a.id)}
                          disabled={deleting === a.id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all flex-shrink-0 mt-0.5"
                          title="Remove announcement"
                        >
                          {deleting === a.id
                            ? <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          }
                        </motion.button>
                      )}
                    </div>
                  </StarsCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="New Announcement">
        <form onSubmit={handleAdd} className="space-y-4">
          {isSuperAdmin && schools.length > 0 && (
            <div>
              <label className="label">School</label>
              <select className="input-field" value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)}>
                <option value="">Default school</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Title *</label>
            <input className="input-field" required value={form.title}
              onChange={e => setForm(f => ({...f, title: e.target.value}))}
              placeholder="Announcement title" />
          </div>
          <div>
            <label className="label">Message *</label>
            <textarea className="input-field" rows={4} required value={form.message}
              onChange={e => setForm(f => ({...f, message: e.target.value}))}
              placeholder="Write your announcement..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
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
              <select className="input-field" value={form.audience} onChange={e => setForm(f => ({...f, audience: e.target.value}))}>
                <option value="all">All</option>
                <option value="parent">Parents</option>
                <option value="teacher">Teachers</option>
                <option value="student">Students</option>
              </select>
            </div>
          </div>
          {saveError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
              {saveError}
            </p>
          )}
          <p className="text-xs text-surface-400 dark:text-gray-500">Auto-removed after 20 days · manually removable anytime</p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Publishing...' : 'Publish'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
