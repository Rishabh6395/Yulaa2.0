'use client';

import { useState, useEffect } from 'react';

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

export default function UsersPage() {
  const [users,        setUsers]        = useState<UserItem[]>([]);
  const [roles,        setRoles]        = useState<Role[]>([]);
  const [schools,      setSchools]      = useState<School[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showCreate,   setShowCreate]   = useState(false);
  const [showAddRole,  setShowAddRole]  = useState<UserItem | null>(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [addRoleForm,  setAddRoleForm]  = useState({ roleId: '', schoolId: '' });
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');

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
    if (!showAddRole) return;
    setSaving(true);
    setError('');
    try {
      const res  = await fetch('/api/super-admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ userId: showAddRole.id, ...addRoleForm, schoolId: addRoleForm.schoolId || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error assigning role'); return; }
      setShowAddRole(null);
      setAddRoleForm({ roleId: '', schoolId: '' });
      await loadAll();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
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

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

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
                {filtered.map(u => (
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
                      <div className="flex flex-wrap gap-1">
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
                        <button
                          onClick={() => { setShowAddRole(u); setAddRoleForm({ roleId: '', schoolId: '' }); setError(''); }}
                          className="text-xs font-medium px-2 py-0.5 rounded-md border border-dashed border-surface-300 dark:border-gray-700 text-surface-400 dark:text-gray-500 hover:border-brand-400 hover:text-brand-500 dark:hover:border-brand-600 dark:hover:text-brand-400 transition-colors"
                        >
                          + Role
                        </button>
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
        )}
      </div>

      {/* Create User modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="flex min-h-full items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">Add User</h2>
              <button onClick={() => setShowCreate(false)} className="text-surface-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 dark:text-gray-400 mb-1">First Name *</label>
                  <input className="input-field w-full" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 dark:text-gray-400 mb-1">Last Name *</label>
                  <input className="input-field w-full" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 dark:text-gray-400 mb-1">Email *</label>
                <input type="email" className="input-field w-full" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 dark:text-gray-400 mb-1">Phone</label>
                <input className="input-field w-full" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 dark:text-gray-400 mb-1">Password *</label>
                <input type="password" className="input-field w-full" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 dark:text-gray-400 mb-1">Role *</label>
                <select className="input-field w-full" value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))} required>
                  <option value="">Select a role...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 dark:text-gray-400 mb-1">School <span className="font-normal text-surface-300 dark:text-gray-600">(if role requires one)</span></label>
                <select className="input-field w-full" value={form.schoolId} onChange={e => setForm(f => ({ ...f, schoolId: e.target.value }))}>
                  <option value="">No school (platform-wide)</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}

      {/* Add Role modal */}
      {showAddRole && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm" onClick={() => setShowAddRole(null)}>
          <div className="flex min-h-full items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">Assign Role</h2>
                <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
                  {showAddRole.firstName} {showAddRole.lastName}
                </p>
              </div>
              <button onClick={() => setShowAddRole(null)} className="text-surface-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <form onSubmit={handleAddRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-500 dark:text-gray-400 mb-1">Role *</label>
                <select
                  className="input-field w-full"
                  value={addRoleForm.roleId}
                  onChange={e => setAddRoleForm(f => ({ ...f, roleId: e.target.value }))}
                  required
                >
                  <option value="">Select a role...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 dark:text-gray-400 mb-1">School <span className="font-normal text-surface-300 dark:text-gray-600">(optional)</span></label>
                <select
                  className="input-field w-full"
                  value={addRoleForm.schoolId}
                  onChange={e => setAddRoleForm(f => ({ ...f, schoolId: e.target.value }))}
                >
                  <option value="">No school (platform-wide)</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddRole(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Assigning...' : 'Assign Role'}
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
