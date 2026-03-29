'use client';

import { useEffect, useState } from 'react';

export default function UsersRolesPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', roleId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [resetTarget, setResetTarget]   = useState<any>(null);
  const [resetPwd,    setResetPwd]      = useState('');
  const [resetSaving, setResetSaving]   = useState(false);
  const [resetError,  setResetError]    = useState('');
  const [resetDone,   setResetDone]     = useState(false);

  const token = () => localStorage.getItem('token') || '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/super-admin/schools/${schoolId}/users`, { headers: headers() });
      const d = await r.json();
      setUsers(d.users || []);
      setRoles(d.roles || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [schoolId]);

  async function handleAdd() {
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.roleId) {
      setError('All fields except phone are required'); return;
    }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/users`, {
        method: 'POST', headers: headers(), body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setShowModal(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', roleId: '' });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: any) {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    await fetch(`/api/super-admin/schools/${schoolId}/users`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ userId: user.id, status: newStatus }),
    });
    load();
  }

  async function addRole(userId: string, roleId: string) {
    await fetch(`/api/super-admin/schools/${schoolId}/users`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ action: 'addRole', userId, roleId }),
    });
    load();
  }

  async function removeRole(userId: string, roleId: string) {
    await fetch(`/api/super-admin/schools/${schoolId}/users`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ action: 'removeRole', userId, roleId }),
    });
    load();
  }

  async function handleResetPassword() {
    if (!resetTarget || !resetPwd) return;
    setResetSaving(true); setResetError('');
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ user_id: resetTarget.id, new_password: resetPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResetDone(true);
    } catch (e: any) { setResetError(e.message); }
    setResetSaving(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Users &amp; Roles</h1>
          <p className="text-sm text-surface-400 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''} in this school</p>
        </div>
        <button onClick={() => { setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', roleId: '' }); setError(''); setShowModal(true); }} className="btn btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add User
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-surface-400">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-surface-400 text-sm">No users assigned to this school yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-surface-500">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-500">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-500">Roles</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-700">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-surface-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-surface-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.userRoles?.map((ur: any) => (
                        <span key={ur.id} className="inline-flex items-center gap-1 text-xs bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">
                          {ur.role?.displayName || ur.role?.roleCode}
                          <button onClick={() => removeRole(u.id, ur.roleId)} className="hover:text-red-600 transition-colors ml-0.5">×</button>
                        </span>
                      ))}
                      <RoleAdder roles={roles} existingRoleIds={u.userRoles?.map((r: any) => r.roleId) || []} onAdd={(rId) => addRole(u.id, rId)} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-100 text-red-600'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => { setResetTarget(u); setResetPwd(''); setResetError(''); setResetDone(false); }}
                        className="text-xs font-medium text-brand-500 hover:text-brand-700"
                      >
                        Reset Password
                      </button>
                      <button onClick={() => toggleStatus(u)} className={`text-xs font-medium ${u.status === 'active' ? 'text-red-500 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-700'}`}>
                        {u.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Reset Password</h2>
            <p className="text-sm text-surface-400">
              Set a new password for <span className="font-medium text-gray-700 dark:text-gray-300">{resetTarget.firstName} {resetTarget.lastName}</span>
            </p>
            {resetDone ? (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  Password reset successfully. The user will be prompted to change it on next login.
                </div>
                <button onClick={() => setResetTarget(null)} className="btn btn-primary w-full">Done</button>
              </div>
            ) : (
              <div className="space-y-3">
                {resetError && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{resetError}</p>}
                <div>
                  <label className="label">New Password *</label>
                  <input
                    className="input" type="password" placeholder="Min. 6 characters"
                    value={resetPwd} onChange={e => setResetPwd(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setResetTarget(null)} className="btn btn-secondary flex-1">Cancel</button>
                  <button onClick={handleResetPassword} disabled={resetSaving || !resetPwd} className="btn btn-primary flex-1">
                    {resetSaving ? 'Resetting…' : 'Reset Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add User</h2>
            {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">First Name *</label><input className="input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                <div><label className="label">Last Name *</label><input className="input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
              </div>
              <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="label">Password *</label><input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}>
                  <option value="">— Select Role —</option>
                  {roles.map((r: any) => <option key={r.id} value={r.id}>{r.displayName || r.roleCode}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="btn btn-primary">{saving ? 'Adding...' : 'Add User'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleAdder({ roles, existingRoleIds, onAdd }: { roles: any[]; existingRoleIds: string[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const available = roles.filter(r => !existingRoleIds.includes(r.id));
  if (available.length === 0) return null;
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="text-xs text-brand-600 hover:text-brand-700 px-1.5 py-0.5 rounded border border-brand-200 dark:border-brand-700">+ Role</button>
      {open && (
        <div className="absolute left-0 top-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-surface-200 dark:border-gray-700 z-10 min-w-[140px]">
          {available.map(r => (
            <button key={r.id} onClick={() => { onAdd(r.id); setOpen(false); }} className="block w-full text-left text-xs px-3 py-2 hover:bg-surface-50 dark:hover:bg-gray-700">
              {r.displayName || r.roleCode}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
