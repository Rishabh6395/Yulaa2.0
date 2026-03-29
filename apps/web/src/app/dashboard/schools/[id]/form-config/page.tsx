'use client';

import { useState } from 'react';

type FieldRule = 'required' | 'optional' | 'hidden';

interface FormField {
  id: string;
  label: string;
  type: string;
  rule: FieldRule;
}

const FORMS: { id: string; label: string; fields: Omit<FormField, 'rule'>[] }[] = [
  {
    id: 'admission',
    label: 'Admission Form',
    fields: [
      { id: 'parentName', label: 'Parent / Guardian Name', type: 'text' },
      { id: 'parentPhone', label: 'Parent Phone', type: 'tel' },
      { id: 'parentEmail', label: 'Parent Email', type: 'email' },
      { id: 'parentOccupation', label: 'Parent Occupation', type: 'text' },
      { id: 'childName', label: 'Child Name', type: 'text' },
      { id: 'childDOB', label: 'Child Date of Birth', type: 'date' },
      { id: 'childGender', label: 'Child Gender', type: 'select' },
      { id: 'previousSchool', label: 'Previous School', type: 'text' },
      { id: 'gradeApplying', label: 'Grade Applying For', type: 'select' },
      { id: 'address', label: 'Residential Address', type: 'textarea' },
      { id: 'bloodGroup', label: 'Blood Group', type: 'select' },
      { id: 'medicalNotes', label: 'Medical / Allergy Notes', type: 'textarea' },
      { id: 'siblings', label: 'Siblings in School', type: 'text' },
      { id: 'photo', label: 'Child Photo Upload', type: 'file' },
    ],
  },
  {
    id: 'student_profile',
    label: 'Student Profile',
    fields: [
      { id: 'rollNumber', label: 'Roll Number', type: 'text' },
      { id: 'dob', label: 'Date of Birth', type: 'date' },
      { id: 'gender', label: 'Gender', type: 'select' },
      { id: 'bloodGroup', label: 'Blood Group', type: 'select' },
      { id: 'address', label: 'Address', type: 'textarea' },
      { id: 'phone', label: 'Contact Phone', type: 'tel' },
      { id: 'photo', label: 'Photo', type: 'file' },
      { id: 'aadhaar', label: 'Aadhaar Number', type: 'text' },
      { id: 'nationality', label: 'Nationality', type: 'text' },
      { id: 'religion', label: 'Religion', type: 'text' },
      { id: 'category', label: 'Category (Gen/OBC/SC/ST)', type: 'select' },
      { id: 'motherTongue', label: 'Mother Tongue', type: 'text' },
    ],
  },
  {
    id: 'leave_request',
    label: 'Leave Request Form',
    fields: [
      { id: 'leaveType', label: 'Leave Type', type: 'select' },
      { id: 'startDate', label: 'From Date', type: 'date' },
      { id: 'endDate', label: 'To Date', type: 'date' },
      { id: 'reason', label: 'Reason', type: 'textarea' },
      { id: 'attachment', label: 'Supporting Document', type: 'file' },
      { id: 'contactDuringLeave', label: 'Contact Number During Leave', type: 'tel' },
    ],
  },
  {
    id: 'fee_payment',
    label: 'Fee Payment Form',
    fields: [
      { id: 'paymentMode', label: 'Payment Mode', type: 'select' },
      { id: 'referenceNo', label: 'Reference / Cheque No.', type: 'text' },
      { id: 'bankName', label: 'Bank Name', type: 'text' },
      { id: 'remarks', label: 'Remarks', type: 'textarea' },
    ],
  },
];

const RULE_OPTIONS: { value: FieldRule; label: string; color: string }[] = [
  { value: 'required', label: 'Required', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400' },
  { value: 'optional', label: 'Optional', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400' },
  { value: 'hidden', label: 'Hidden', color: 'text-surface-400 bg-surface-100 dark:bg-gray-700 dark:text-gray-500' },
];

const TYPE_ICONS: Record<string, string> = {
  text: 'T', tel: '☎', email: '@', date: '📅', select: '▾', textarea: '¶', file: '📎',
};

export default function FormConfigPage({ params }: { params: { id: string } }) {
  const [activeForm, setActiveForm] = useState(FORMS[0].id);
  const [configs, setConfigs] = useState<Record<string, Record<string, FieldRule>>>(() => {
    const init: Record<string, Record<string, FieldRule>> = {};
    FORMS.forEach(f => {
      init[f.id] = {};
      f.fields.forEach(field => {
        init[f.id][field.id] = 'optional';
      });
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const form = FORMS.find(f => f.id === activeForm)!;
  const formConfig = configs[activeForm] || {};

  function setRule(fieldId: string, rule: FieldRule) {
    setConfigs(c => ({ ...c, [activeForm]: { ...c[activeForm], [fieldId]: rule } }));
  }

  function setAllRule(rule: FieldRule) {
    const all: Record<string, FieldRule> = {};
    form.fields.forEach(f => { all[f.id] = rule; });
    setConfigs(c => ({ ...c, [activeForm]: all }));
  }

  async function save() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const requiredCount = form.fields.filter(f => formConfig[f.id] === 'required').length;
  const hiddenCount   = form.fields.filter(f => formConfig[f.id] === 'hidden').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Form Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Set field visibility and validation rules per form for this school.</p>
      </div>

      <div className="flex gap-6">
        {/* Form selector */}
        <div className="w-52 shrink-0 space-y-1">
          {FORMS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveForm(f.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${activeForm === f.id ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 font-medium' : 'text-surface-400 hover:bg-surface-50 dark:hover:bg-gray-700/40'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Field rules editor */}
        <div className="flex-1 card p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{form.label}</h2>
              <p className="text-xs text-surface-400 mt-0.5">
                {requiredCount} required · {form.fields.length - requiredCount - hiddenCount} optional · {hiddenCount} hidden
              </p>
            </div>
            <div className="flex gap-1.5">
              {RULE_OPTIONS.map(r => (
                <button key={r.value} onClick={() => setAllRule(r.value)} className={`text-xs px-2 py-1 rounded font-medium ${r.color}`}>
                  All {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            {form.fields.map(field => {
              const currentRule = formConfig[field.id] || 'optional';
              return (
                <div key={field.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-50 dark:hover:bg-gray-700/30 transition-colors group">
                  <span className="w-7 text-center text-xs text-surface-300 dark:text-gray-600 font-mono shrink-0">
                    {TYPE_ICONS[field.type] || 'T'}
                  </span>
                  <span className={`flex-1 text-sm ${currentRule === 'hidden' ? 'text-surface-300 dark:text-gray-600 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                    {field.label}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    {RULE_OPTIONS.map(r => (
                      <button
                        key={r.value}
                        onClick={() => setRule(field.id, r.value)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${currentRule === r.value ? r.color : 'text-surface-300 dark:text-gray-600 hover:text-surface-500'}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-surface-100 dark:border-gray-700">
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Form Config'}
            </button>
            {saved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
