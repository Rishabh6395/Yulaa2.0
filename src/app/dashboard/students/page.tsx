'use client';

import { useState, useEffect, useCallback } from 'react';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'badge-success',
    pending: 'badge-warning',
    rejected: 'badge-danger',
    withdrawn: 'badge-neutral',
  };
  return <span className={map[status] || 'badge-neutral'}>{status}</span>;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [classFilter, setClassFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ admission_no: '', first_name: '', last_name: '', dob: '', gender: '', class_id: '', address: '' });
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: '15' });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (classFilter) params.set('class_id', classFilter);

    const res = await fetch(`/api/students?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setStudents(data.students || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, search, statusFilter, classFilter, token]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setClasses(d.classes || []));
  }, [token]);

  const handleApproval = async (id: string, status: string) => {
    await fetch('/api/students', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ id, admission_status: status }),
    });
    fetchStudents();
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/students', {
      method: 'POST',
      headers,
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowAddModal(false);
      setForm({ admission_no: '', first_name: '', last_name: '', dob: '', gender: '', class_id: '', address: '' });
      fetchStudents();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Students</h1>
          <p className="text-sm text-surface-400 mt-0.5">{total} students total</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name or admission no..."
          className="input-field max-w-xs"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input-field max-w-[160px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="input-field max-w-[180px]" value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}>
          <option value="">All Classes</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.grade} - {c.section}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission No</th>
                <th>Class</th>
                <th>Gender</th>
                <th>Status</th>
                <th>Parents</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-20"/></td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-surface-400">No students found</td></tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-xs font-bold">
                          {s.first_name[0]}{s.last_name[0]}
                        </div>
                        <span className="font-medium text-gray-900">{s.first_name} {s.last_name}</span>
                      </div>
                    </td>
                    <td><span className="font-mono text-xs bg-surface-50 px-2 py-1 rounded">{s.admission_no}</span></td>
                    <td>{s.grade ? `${s.grade} - ${s.section}` : '—'}</td>
                    <td className="capitalize">{s.gender || '—'}</td>
                    <td><StatusBadge status={s.admission_status} /></td>
                    <td>
                      {s.parents ? (
                        <span className="text-xs text-surface-400">{s.parents.map((p: any) => p.name).join(', ')}</span>
                      ) : '—'}
                    </td>
                    <td>
                      {s.admission_status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleApproval(s.id, 'approved')} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-100 font-medium transition-colors">Approve</button>
                          <button onClick={() => handleApproval(s.id, 'rejected')} className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-100 font-medium transition-colors">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
            <p className="text-xs text-surface-400">Page {page} of {Math.ceil(total / 15)}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3">Previous</button>
              <button disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="card p-6 w-full max-w-lg shadow-modal animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-display font-bold text-gray-900 mb-4">Add New Student</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input className="input-field" required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})}/>
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input className="input-field" required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Admission No *</label>
                  <input className="input-field" required value={form.admission_no} onChange={e => setForm({...form, admission_no: e.target.value})}/>
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input type="date" className="input-field" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Gender</label>
                  <select className="input-field" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Class</label>
                  <select className="input-field" value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})}>
                    <option value="">Select</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.grade} - {c.section}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <textarea className="input-field" rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})}/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Add Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
