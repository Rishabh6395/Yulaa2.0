'use client';

import { useEffect, useRef, useState } from 'react';

type YearbookEntry = {
  id: string;
  academicYear: string;
  classId: string | null;
  title: string;
  caption: string | null;
  mediaType: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  class?: { name: string; grade: string; section: string } | null;
  uploader: { firstName: string; lastName: string };
};

type ClassOption = { id: string; name: string; grade: string; section: string };

const MEDIA_ICONS: Record<string, string> = {
  photo:    '🖼️',
  video:    '🎬',
  document: '📄',
};

const MEDIA_COLORS: Record<string, string> = {
  photo:    'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  video:    'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  document: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
};

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function YearbookPage() {
  const [entries,      setEntries]      = useState<YearbookEntry[]>([]);
  const [years,        setYears]        = useState<string[]>([]);
  const [classes,      setClasses]      = useState<ClassOption[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [error,        setError]        = useState('');
  const [filterYear,   setFilterYear]   = useState('');
  const [filterClass,  setFilterClass]  = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [showUpload,   setShowUpload]   = useState(false);
  const [lightbox,     setLightbox]     = useState<YearbookEntry | null>(null);
  const [userRole,     setUserRole]     = useState('');
  const [userId,       setUserId]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    academicYear: '',
    classId: '',
    title: '',
    caption: '',
    mediaType: 'photo',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (typeof window === 'undefined' || !token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserRole(payload.primaryRole || '');
      setUserId(payload.sub || payload.id || '');
    } catch {}
  }, []);

  const canManage = ['teacher', 'school_admin', 'principal', 'hod'].includes(userRole);
  const canDelete = (entry: YearbookEntry) =>
    ['school_admin', 'principal'].includes(userRole) || canManage;

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterYear)  params.set('academicYear', filterYear);
    if (filterClass) params.set('classId', filterClass);
    if (filterType)  params.set('mediaType', filterType);
    fetch(`/api/yearbook?${params}`, { headers })
      .then(r => r.json())
      .then(d => { setEntries(d.entries ?? []); setYears(d.years ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterYear, filterClass, filterType]);

  useEffect(() => {
    fetch('/api/classes', { headers })
      .then(r => r.json())
      .then(d => setClasses(d.classes ?? []))
      .catch(() => {});
  }, []);

  // Auto-detect current academic year for upload form
  useEffect(() => {
    const now   = new Date();
    const yr    = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    setForm(f => ({ ...f, academicYear: `${yr}-${yr + 1}` }));
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { setError('Please select a file'); return; }
    setUploading(true); setError('');

    // 1. Upload file first
    const fd = new FormData();
    fd.append('file', selectedFile);
    const upRes  = await fetch('/api/upload', { method: 'POST', headers, body: fd });
    const upData = await upRes.json();
    if (!upRes.ok) { setError(upData.error || 'File upload failed'); setUploading(false); return; }

    // 2. Save yearbook entry
    const res = await fetch('/api/yearbook', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        classId:  form.classId || null,
        fileUrl:  upData.url,
        fileName: upData.name,
        fileSize: upData.size,
        mimeType: upData.type,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to save entry'); setUploading(false); return; }

    setShowUpload(false);
    setSelectedFile(null);
    setForm(f => ({ ...f, classId: '', title: '', caption: '', mediaType: 'photo' }));
    load();
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this memory?')) return;
    await fetch('/api/yearbook', {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  // Group entries by academic year then by class
  const grouped: Record<string, Record<string, YearbookEntry[]>> = {};
  for (const e of entries) {
    if (!grouped[e.academicYear]) grouped[e.academicYear] = {};
    const classKey = e.class ? `${e.class.grade}-${e.class.section} (${e.class.name})` : 'School-wide';
    if (!grouped[e.academicYear][classKey]) grouped[e.academicYear][classKey] = [];
    grouped[e.academicYear][classKey].push(e);
  }

  const isImage = (e: YearbookEntry) =>
    e.mediaType === 'photo' || (e.mimeType ?? '').startsWith('image/');
  const isVideo = (e: YearbookEntry) =>
    e.mediaType === 'video' || (e.mimeType ?? '').startsWith('video/');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">📚 Year Book</h1>
          <p className="text-sm text-surface-400 mt-0.5">Memories, photos, videos and documents — organised by academic year &amp; class.</p>
        </div>
        {canManage && (
          <button onClick={() => setShowUpload(true)} className="btn btn-primary">+ Add Memory</button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <select className="input w-auto text-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input w-auto text-sm" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.grade}-{c.section} ({c.name})</option>)}
        </select>
        <div className="flex gap-1">
          {['', 'photo', 'video', 'document'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium capitalize transition-colors ${filterType === t ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-gray-800 text-surface-500'}`}>
              {t === '' ? 'All' : `${MEDIA_ICONS[t]} ${t}`}
            </button>
          ))}
        </div>
        {entries.length > 0 && (
          <span className="text-xs text-surface-400 ml-auto">{entries.length} item{entries.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Memory</h2>
              <button onClick={() => setShowUpload(false)} className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Academic Year</label>
                  <input required className="input" placeholder="2024-2025" value={form.academicYear}
                    onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Class (optional)</label>
                  <select className="input" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                    <option value="">School-wide</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.grade}-{c.section} ({c.name})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Title</label>
                <input required className="input" placeholder="e.g. Annual Day 2024" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Caption (optional)</label>
                <textarea className="input" rows={2} placeholder="A short description or memory…" value={form.caption}
                  onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} />
              </div>
              <div>
                <label className="label">Type</label>
                <div className="flex gap-3 flex-wrap">
                  {['photo', 'video', 'document'].map(t => (
                    <label key={t} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${form.mediaType === t ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-surface-200 dark:border-gray-700'}`}>
                      <input type="radio" className="hidden" value={t} checked={form.mediaType === t}
                        onChange={() => setForm(f => ({ ...f, mediaType: t }))} />
                      <span className="text-sm font-medium">{MEDIA_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">File</label>
                <input ref={fileRef} type="file" className="input text-sm py-1.5"
                  accept={form.mediaType === 'photo' ? 'image/*' : form.mediaType === 'video' ? 'video/*' : '*'}
                  onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
                {selectedFile && <p className="text-xs text-surface-400 mt-1">{selectedFile.name} · {formatBytes(selectedFile.size)}</p>}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={uploading} className="btn btn-primary">
                  {uploading ? 'Uploading…' : 'Save Memory'}
                </button>
                <button type="button" onClick={() => setShowUpload(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            {isImage(lightbox) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lightbox.fileUrl} alt={lightbox.title} className="w-full max-h-[80vh] object-contain rounded-xl" />
            ) : isVideo(lightbox) ? (
              <video src={lightbox.fileUrl} controls autoPlay className="w-full max-h-[80vh] rounded-xl" />
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-10 text-center">
                <p className="text-5xl mb-4">📄</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{lightbox.fileName}</p>
                <a href={lightbox.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-4 inline-block">Open File</a>
              </div>
            )}
            <div className="mt-3 text-center">
              <p className="text-white font-semibold">{lightbox.title}</p>
              {lightbox.caption && <p className="text-white/70 text-sm mt-0.5">{lightbox.caption}</p>}
              <button onClick={() => setLightbox(null)} className="mt-3 text-white/60 hover:text-white text-sm">✕ Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-surface-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">📷</p>
          <p className="text-surface-400">No memories added yet.</p>
          {canManage && (
            <button onClick={() => setShowUpload(true)} className="text-brand-600 dark:text-brand-400 text-sm mt-2 hover:underline">
              Add the first memory →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped).map(([year, byClass]) => (
            <div key={year}>
              {/* Year header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">📅 {year}</span>
                <span className="text-xs text-surface-400 bg-surface-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {Object.values(byClass).flat().length} items
                </span>
              </div>

              <div className="space-y-6">
                {Object.entries(byClass).map(([classLabel, items]) => (
                  <div key={classLabel}>
                    {/* Class sub-header */}
                    <p className="text-sm font-semibold text-surface-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                      <span className="inline-block w-1 h-4 rounded bg-brand-400" />
                      {classLabel}
                      <span className="font-normal text-xs">({items.length})</span>
                    </p>

                    {/* Media grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {items.map(entry => (
                        <div key={entry.id} className="group relative rounded-xl overflow-hidden bg-surface-100 dark:bg-gray-800 aspect-square cursor-pointer"
                          onClick={() => setLightbox(entry)}>

                          {/* Thumbnail */}
                          {isImage(entry) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={entry.fileUrl} alt={entry.title}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          ) : isVideo(entry) ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                              <span className="text-4xl">▶️</span>
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
                              <span className="text-4xl">📄</span>
                              <p className="text-xs text-center text-surface-500 dark:text-gray-400 line-clamp-2">{entry.fileName}</p>
                            </div>
                          )}

                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100">
                            {/* Type badge */}
                            <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${MEDIA_COLORS[entry.mediaType] ?? ''}`}>
                              {MEDIA_ICONS[entry.mediaType]} {entry.mediaType}
                            </span>

                            {/* Bottom row */}
                            <div className="flex items-end justify-between gap-1">
                              <p className="text-white text-xs font-medium line-clamp-2 flex-1">{entry.title}</p>
                              {canManage && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleDelete(entry.id); }}
                                  className="shrink-0 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs"
                                  title="Delete"
                                >✕</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
