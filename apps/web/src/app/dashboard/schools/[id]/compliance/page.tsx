'use client';

import { useState } from 'react';

const COMPLIANCE_ITEMS = [
  { id: 'tc_doc', label: 'Transfer Certificates', desc: 'Track issuance of TCs for outgoing students' },
  { id: 'admission_form', label: 'Admission Forms', desc: 'Digital admission form compliance' },
  { id: 'fee_receipts', label: 'Fee Receipts', desc: 'Auto-generate compliant fee receipts' },
  { id: 'attendance_register', label: 'Attendance Register', desc: 'Maintain digital attendance records for audit' },
  { id: 'staff_records', label: 'Staff Records', desc: 'Employee qualification and verification documents' },
  { id: 'scholarship_tracking', label: 'Scholarship Tracking', desc: 'Track and report scholarship disbursements' },
  { id: 'rti_reports', label: 'RTI Reports', desc: 'Generate Right to Information compliance reports' },
];

export default function CompliancePage({ params }: { params: { id: string } }) {
  const [enabled, setEnabled] = useState<string[]>(['tc_doc', 'admission_form', 'fee_receipts', 'attendance_register']);
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [boardAffiliationNo, setBoardAffiliationNo] = useState('');
  const [udiseCode, setUdiseCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setEnabled(n => n.includes(id) ? n.filter(x => x !== id) : [...n, id]);
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
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Compliance</h1>
        <p className="text-sm text-surface-400 mt-0.5">Regulatory compliance tracking and reporting settings.</p>
      </div>

      {/* School Identifiers */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">School Identifiers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Current Academic Year</label>
            <input className="input" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2024-25" />
          </div>
          <div>
            <label className="label">Board Affiliation No.</label>
            <input className="input" value={boardAffiliationNo} onChange={e => setBoardAffiliationNo(e.target.value)} placeholder="e.g. CBSE123456" />
          </div>
          <div>
            <label className="label">UDISE Code</label>
            <input className="input" value={udiseCode} onChange={e => setUdiseCode(e.target.value)} placeholder="11-digit UDISE code" />
          </div>
        </div>
      </div>

      {/* Compliance Modules */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Compliance Modules</h2>
        <div className="space-y-3">
          {COMPLIANCE_ITEMS.map(item => (
            <label key={item.id} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-gray-700/30 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-brand-500 mt-0.5"
                checked={enabled.includes(item.id)}
                onChange={() => toggle(item.id)}
              />
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.label}</div>
                <div className="text-xs text-surface-400">{item.desc}</div>
              </div>
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
