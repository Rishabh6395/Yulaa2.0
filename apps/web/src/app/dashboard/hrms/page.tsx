'use client';

import { useState, useEffect, useCallback } from 'react';

interface SalaryConfig {
  id: string; basic: string; hra: string; da: string; ta: string;
  otherAllowances: string; pfPercent: string; tdsMonthly: string; effectiveFrom: string;
  teacher: { id: string; employeeId: string | null; designation: string | null; user: { firstName: string; lastName: string } };
}
interface Payroll {
  id: string; month: number; year: number; workingDays: number; presentDays: number;
  grossSalary: string; netSalary: string; pfEmployee: string; tds: string; status: string;
  teacher: { id: string; user: { firstName: string; lastName: string } };
}

function hdrs() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TABS = ['Salary Config', 'Payroll'] as const;
type Tab = typeof TABS[number];

export default function HrmsPage() {
  const [tab, setTab]             = useState<Tab>('Salary Config');
  const [configs, setConfigs]     = useState<SalaryConfig[]>([]);
  const [payrolls, setPayrolls]   = useState<Payroll[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const [payMonth, setPayMonth] = useState(now.getMonth() + 1);
  const [payYear, setPayYear]   = useState(now.getFullYear());

  // Salary config form
  const [cfgTeacherId, setCfgTeacherId] = useState('');
  const [cfgBasic, setCfgBasic]         = useState('');
  const [cfgHra, setCfgHra]             = useState('0');
  const [cfgDa, setCfgDa]               = useState('0');
  const [cfgTa, setCfgTa]               = useState('0');
  const [cfgOther, setCfgOther]         = useState('0');
  const [cfgTds, setCfgTds]             = useState('0');
  const [cfgEffective, setCfgEffective] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'Salary Config') {
        const r = await fetch('/api/hrms/salary-config', { headers: hdrs() });
        const d = await r.json(); setConfigs(d.configs ?? []);
      } else {
        const r = await fetch(`/api/hrms/payroll?month=${payMonth}&year=${payYear}`, { headers: hdrs() });
        const d = await r.json(); setPayrolls(d.payrolls ?? []);
      }
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  }, [tab, payMonth, payYear]);

  useEffect(() => { load(); }, [load]);

  async function saveConfig() {
    if (!cfgTeacherId || !cfgBasic || !cfgEffective) {
      setError('Teacher, basic salary, and effective date are required'); return;
    }
    const r = await fetch('/api/hrms/salary-config', {
      method: 'POST', headers: hdrs(),
      body: JSON.stringify({
        teacherId: cfgTeacherId, basic: Number(cfgBasic), hra: Number(cfgHra),
        da: Number(cfgDa), ta: Number(cfgTa), otherAllowances: Number(cfgOther),
        tdsMonthly: Number(cfgTds), effectiveFrom: cfgEffective,
      }),
    });
    if (r.ok) {
      setCfgTeacherId(''); setCfgBasic(''); setCfgHra('0'); setCfgDa('0');
      setCfgTa('0'); setCfgOther('0'); setCfgTds('0'); setCfgEffective('');
      setShowForm(false); load();
    } else {
      const d = await r.json(); setError(d.error ?? 'Failed to save config');
    }
  }

  async function generatePayroll() {
    setGenerating(true); setError('');
    const r = await fetch('/api/hrms/payroll', {
      method: 'POST', headers: hdrs(),
      body: JSON.stringify({ month: payMonth, year: payYear }),
    });
    setGenerating(false);
    if (r.ok) load();
    else { const d = await r.json(); setError(d.error ?? 'Failed to generate payroll'); }
  }

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      draft:    'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      paid:     'bg-emerald-100 text-emerald-700',
    };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${m[s] ?? 'bg-gray-100 text-gray-600'}`;
  };

  const fmt = (n: string | number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HR & Payroll</h1>
        {tab === 'Salary Config' && (
          <button onClick={() => { setShowForm(s => !s); setError(''); }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            {showForm ? 'Cancel' : '+ Add Salary Config'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setShowForm(false); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t}</button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

      {/* Salary Config form */}
      {showForm && tab === 'Salary Config' && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input value={cfgTeacherId} onChange={e => setCfgTeacherId(e.target.value)} placeholder="Teacher ID *" className="input" />
          <input value={cfgBasic} onChange={e => setCfgBasic(e.target.value)} type="number" placeholder="Basic ₹ *" className="input" />
          <input value={cfgHra} onChange={e => setCfgHra(e.target.value)} type="number" placeholder="HRA ₹" className="input" />
          <input value={cfgDa} onChange={e => setCfgDa(e.target.value)} type="number" placeholder="DA ₹" className="input" />
          <input value={cfgTa} onChange={e => setCfgTa(e.target.value)} type="number" placeholder="TA ₹" className="input" />
          <input value={cfgOther} onChange={e => setCfgOther(e.target.value)} type="number" placeholder="Other Allowances ₹" className="input" />
          <input value={cfgTds} onChange={e => setCfgTds(e.target.value)} type="number" placeholder="TDS Monthly ₹" className="input" />
          <input value={cfgEffective} onChange={e => setCfgEffective(e.target.value)} type="date" className="input" />
          <button onClick={saveConfig} className="sm:col-span-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Save Salary Configuration
          </button>
        </div>
      )}

      {/* Payroll controls */}
      {tab === 'Payroll' && (
        <div className="flex gap-3 items-center flex-wrap">
          <select value={payMonth} onChange={e => setPayMonth(Number(e.target.value))} className="input w-32">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <input value={payYear} onChange={e => setPayYear(Number(e.target.value))} type="number" className="input w-24" />
          <button onClick={generatePayroll} disabled={generating}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {generating ? 'Generating…' : 'Generate Payroll'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          {/* Salary Config Table */}
          {tab === 'Salary Config' && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{['Teacher', 'Designation', 'Basic', 'HRA', 'DA', 'TA', 'Other', 'TDS', 'Effective From'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {configs.map(c => (
                    <tr key={c.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {c.teacher.user.firstName} {c.teacher.user.lastName}
                        {c.teacher.employeeId && <span className="text-xs text-gray-400 ml-1">({c.teacher.employeeId})</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.teacher.designation ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200 font-medium">{fmt(c.basic)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(c.hra)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(c.da)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(c.ta)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(c.otherAllowances)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(c.tdsMonthly)}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(c.effectiveFrom).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {configs.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No salary configurations yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Payroll Table */}
          {tab === 'Payroll' && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{['Teacher', 'Period', 'Working Days', 'Present', 'Gross', 'PF', 'TDS', 'Net', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {payrolls.map(p => (
                    <tr key={p.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {p.teacher.user.firstName} {p.teacher.user.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{MONTHS[p.month - 1]} {p.year}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.workingDays}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.presentDays}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{fmt(p.grossSalary)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(p.pfEmployee)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(p.tds)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{fmt(p.netSalary)}</td>
                      <td className="px-4 py-3"><span className={statusBadge(p.status)}>{p.status}</span></td>
                    </tr>
                  ))}
                  {payrolls.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No payroll records for this period</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
