'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';

interface Role   { id: string; code: string; displayName: string; description: string | null }
interface School { id: string; name: string }
interface UserRole {
  id: string;
  roleId: string;
  schoolId: string | null;
  isPrimary: boolean;
  role:   Role;
  school: School | null;
}
interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  createdAt: string;
  userRoles: UserRole[];
}

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
  inactive: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400',
};

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '', password: '',
  roleId: '', schoolId: '',
};

const ITEMS_PER_PAGE = 10;

export default function UsersPage() {
  const [users,        setUsers]        = useState<UserItem[]>([]);
  const [roles,        setRoles]        = useState<Role[]>([]);
  const [schools,      setSchools]      = useState<School[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showCreate,   setShowCreate]   = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);

  // Inline role popover
  const [rolePopoverUser, setRolePopoverUser] = useState<UserItem | null>(null);
  const [addRoleForm,     setAddRoleForm]     = useState({ roleId: '', schoolId: '' });
  const [popoverError,    setPopoverError]    = useState('');
  const [popoverSaving,   setPopoverSaving]   = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!rolePopoverUser) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setRolePopoverUser(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [rolePopoverUser]);

  // Reset to page 1 when search changes
  useEffect(() => { setCurrentPage(1); }, [search]);

  function getToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [uRes, rRes, sRes] = await Promise.all([
        fetch('/api/super-admin/users',           { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('/api/super-admin/users?roles=1',   { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('/api/super-admin/schools',          { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      const [uData, rData, sData] = await Promise.all([uRes.json(), rRes.json(), sRes.json()]);
      setUsers(uData.users   || []);
      setRoles(rData.roles   || []);
      setSchools(sData.schools || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res  = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, schoolId: form.schoolId || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error creating user'); return; }
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await loadAll();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    if (!rolePopoverUser) return;
    setPopoverSaving(true);
    setPopoverError('');
    try {
      const res  = await fetch('/api/super-admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ userId: rolePopoverUser.id, ...addRoleForm, schoolId: addRoleForm.schoolId || null }),
      });
      const data = await res.json();
      if (!res.ok) { setPopoverError(data.error || 'Error assigning role'); return; }
      setRolePopoverUser(null);
      setAddRoleForm({ roleId: '', schoolId: '' });
      await loadAll();
    } catch {
      setPopoverError('Network error');
    } finally {
      setPopoverSaving(false);
    }
  }

  async function removeRole(userId: string, roleId: string) {
    await fetch('/api/super-admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ userId, removeRoleId: roleId }),
    });
    await loadAll();
  }

  async function toggleStatus(u: UserItem) {
    await fetch('/api/super-admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ userId: u.id, status: u.status === 'active' ? 'inactive' : 'active' }),
    });
    await loadAll();
  }

  const filtered   = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // Build page number list with ellipsis
  function getPageNumbers(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (safePage > 3) pages.push('...');
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) {
      pages.push(p);
    }
    if (safePage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Users &amp; Roles</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Add users and manage their platform roles.</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setError(''); setShowCreate(true); }} className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-gray-500">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="input-field w-full pl-9"
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-surface-400 dark:text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-surface-400 dark:text-gray-500">No users found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-900/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">Roles</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3"/>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                  {paginated.map(u => (
                    <tr key={u.id} className="hover:bg-surface-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold flex-shrink-0">
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-surface-400 dark:text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">{u.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 items-center">
                          {u.userRoles.map(ur => (
                            <span
                              key={ur.id}
                              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400"
                            >
                              {ur.role.displayName}
                              {ur.school && <span className="text-[10px] text-surface-400 dark:text-gray-500">· {ur.school.name}</span>}
                              <button
                                onClick={() => removeRole(u.id, ur.roleId)}
                                className="ml-0.5 text-surface-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                title="Remove role"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </span>
                          ))}

                          {/* Inline role popover */}
                          <div
                            className="relative"
                            ref={rolePopoverUser?.id === u.id ? popoverRef : undefined}
                          >
                            <button
                              onClick={() => {
                                if (rolePopoverUser?.id === u.id) {
                                  setRolePopoverUser(null);
                                } else {
                                  setRolePopoverUser(u);
                                  setAddRoleForm({ roleId: '', schoolId: '' });
                                  setPopoverError('');
                                }
                              }}
                              className={`text-xs font-medium px-2 py-0.5 rounded-md border border-dashed transition-colors ${
                                rolePopoverUser?.id === u.id
                                  ? 'border-brand-400 text-brand-500 dark:border-brand-600 dark:text-brand-400'
                                  : 'border-surface-300 dark:border-gray-700 text-surface-400 dark:text-gray-500 hover:border-brand-400 hover:text-brand-500 dark:hover:border-brand-600 dark:hover:text-brand-400'
                              }`}
                            >
                              + Role
                            </button>

                            {rolePopoverUser?.id === u.id && (
                              <div className="absolute top-full left-0 mt-1.5 z-30 w-56 bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl shadow-xl">
                                <div className="px-3 pt-3 pb-1">
                                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Assign Role</p>
                                  {popoverError && (
                                    <p className="text-xs text-red-500 dark:text-red-400 mb-2">{popoverError}</p>
                                  )}
                                  <form onSubmit={handleAddRole} className="space-y-2">
                                    <select
                                      className="input-field w-full text-xs py-1.5"
                                      value={addRoleForm.roleId}
                                      onChange={e => setAddRoleForm(f => ({ ...f, roleId: e.target.value }))}
                                      required
                                      autoFocus
                                    >
                                      <option value="">Select role...</option>
                                      {roles.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}
                                    </select>
                                    <select
                                      className="input-field w-full text-xs py-1.5"
                                      value={addRoleForm.schoolId}
                                      onChange={e => setAddRoleForm(f => ({ ...f, schoolId: e.target.value }))}
                                    >
                                      <option value="">No school</option>
                                      {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <div className="flex gap-2 pb-2">
                                      <button
                                        type="button"
                                        onClick={() => setRolePopoverUser(null)}
                                        className="flex-1 text-xs py-1.5 rounded-lg border border-surface-200 dark:border-gray-700 text-surface-500 dark:text-gray-400 hover:bg-surface-50 dark:hover:bg-gray-800 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={popoverSaving}
                                        className="flex-1 text-xs py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors disabled:opacity-60"
                                      >
                                        {popoverSaving ? '...' : 'Assign'}
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${STATUS_STYLES[u.status] || STATUS_STYLES.active}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleStatus(u)}
                          className={`text-xs font-medium hover:underline ${u.status === 'active' ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-gray-800">
                <p className="text-xs text-surface-400 dark:text-gray-500">
                  Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} users
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-surface-200 dark:border-gray-700 text-surface-500 dark:text-gray-400 hover:bg-surface-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>
                  {getPageNumbers().map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-surface-300 dark:text-gray-600">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[2rem] px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                          p === safePage
                            ? 'bg-brand-600 border-brand-600 text-white font-semibold'
                            : 'border-surface-200 dark:border-gray-700 text-surface-500 dark:text-gray-400 hover:bg-surface-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-surface-200 dark:border-gray-700 text-surface-500 dark:text-gray-400 hover:bg-surface-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add User">
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg mb-4">{error}</div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name *</label>
              <input className="input-field w-full" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input-field w-full" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input-field w-full" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input-field w-full" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="label">Password *</label>
            <input type="password" className="input-field w-full" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="label">Role *</label>
            <select className="input-field w-full" value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))} required>
              <option value="">Select a role...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">School <span className="font-normal text-surface-300 dark:text-gray-600">(if role requires one)</span></label>
            <select className="input-field w-full" value={form.schoolId} onChange={e => setForm(f => ({ ...f, schoolId: e.target.value }))}>
              <option value="">No school (platform-wide)</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
