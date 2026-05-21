'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { FORM_DEFINITIONS } from '@/lib/formDefinitions';

const SEL_CLS = 'input text-sm w-full';

function getToken() {
  if (typeof document === 'undefined') return '';
  return document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='))?.split('=')[1] ?? '';
}

const MASTER_SECTIONS = [
  {
    title: 'Student & Staff',
    items: [
      { label: 'Gender',          href: '/dashboard/masters/gender',         icon: 'Users',         desc: 'Gender options for students and staff' },
      { label: 'Blood Groups',    href: '/dashboard/masters/blood-groups',   icon: 'Heart',         desc: 'Blood group options' },
      { label: 'Qualifications',  href: '/dashboard/masters/qualifications', icon: 'GraduationCap', desc: 'Staff qualification types' },
      { label: 'Streams',         href: '/dashboard/masters/streams',        icon: 'BookMarked',    desc: 'Academic streams available' },
    ],
  },
  {
    title: 'Academic',
    items: [
      { label: 'Classes',         href: '/dashboard/masters/classes',       icon: 'ListOrdered',    desc: 'Class / section records used across the school' },
      { label: 'Subjects',        href: '/dashboard/masters/subjects',      icon: 'BookMarked',     desc: 'Subject catalog linked to grade / class levels' },
      { label: 'Exam Types',      href: '/dashboard/masters/exam-types',    icon: 'ClipboardCheck', desc: 'Types of exams / terms' },
      { label: 'Grading Types',   href: '/dashboard/masters/grading-types', icon: 'BarChart',       desc: 'Grade scales per exam type' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Announcement Types', href: '/dashboard/masters/announcement-types', icon: 'Megaphone',    desc: 'Categories for announcements' },
      { label: 'Event Types',        href: '/dashboard/masters/event-types',        icon: 'CalendarStar', desc: 'Categories for school events' },
    ],
  },
  {
    title: 'Location',
    items: [
      { label: 'School Locations', href: '/dashboard/masters/school-location', icon: 'Building', desc: 'Physical campus addresses — uses system country/state/district' },
    ],
  },
  {
    title: 'School Structure',
    items: [
      { label: 'School Hierarchy', href: '/dashboard/masters/school-hierarchy', icon: 'Network', desc: 'Organizational hierarchy (Trust → Campus → Wing)' },
    ],
  },
  {
    title: 'Forms & Leaves',
    items: [
      { label: 'Leave Types',   href: '/dashboard/masters/leave-types',   icon: 'Calendar',  desc: 'Leave categories for staff' },
      { label: 'Content Types', href: '/dashboard/masters/content-types', icon: 'FileText',  desc: 'Custom fields for school forms' },
    ],
  },
  {
    title: 'Vendor / Marketplace',
    items: [
      { label: 'Product Categories', href: '/dashboard/masters/custom/product_category', icon: 'ShoppingBag', desc: 'Product categories for vendor marketplace' },
    ],
  },
  {
    title: 'Student Compliance',
    items: [
      { label: 'Category',           href: '/dashboard/masters/custom/category',           icon: 'Users',         desc: 'General, OBC, SC, ST, EWS — used in admission forms and compliance reports' },
      { label: 'Religion',           href: '/dashboard/masters/custom/religion',           icon: 'BookMarked',    desc: 'Religion options for student profile and admission form' },
      { label: 'Mother Tongue',      href: '/dashboard/masters/custom/mother_tongue',      icon: 'MessageCircle', desc: 'Language spoken at home — required for board-level reports' },
      { label: 'Admission Category', href: '/dashboard/masters/custom/admission_category', icon: 'FileText',      desc: 'Regular, EWS/RTE, Sports, Management quota and other admission routes' },
      { label: 'Boarding Type',      href: '/dashboard/masters/custom/boarding_type',      icon: 'Building',      desc: 'Day Scholar, Boarder, Weekly Boarder — for hostel-enabled schools' },
      { label: 'Diet Type',          href: '/dashboard/masters/custom/diet_type',          icon: 'Heart',         desc: 'Dietary preferences for hostel and canteen planning' },
      { label: 'Disability Type',    href: '/dashboard/masters/custom/disability_type',    icon: 'Shield',        desc: 'Visual, Hearing, Dyslexia, ADHD and other special needs categories' },
      { label: 'Learning Support',   href: '/dashboard/masters/custom/learning_support',   icon: 'Layers',        desc: 'Level of additional support needed — None, Mild, IEP Required' },
    ],
  },
  {
    title: 'Staff & HR',
    items: [
      { label: 'Designation Type',     href: '/dashboard/masters/custom/designation_type', icon: 'GraduationCap',  desc: 'PRT, TGT, PGT, HOD, Counselor and other staff designations' },
      { label: 'Employment Type',      href: '/dashboard/masters/custom/employment_type',  icon: 'Users',          desc: 'Permanent, Contractual, Guest Faculty, On Deputation' },
      { label: 'Teacher Certification',href: '/dashboard/masters/custom/teacher_cert',     icon: 'ClipboardCheck', desc: 'B.Ed, CTET, IB Certificate and other teaching qualifications' },
      { label: 'Visa / Work Permit',   href: '/dashboard/masters/custom/visa_type',        icon: 'Globe',          desc: 'Work Permit, OCI Card — for international staff and student tracking' },
    ],
  },
  {
    title: 'Fee & Finance',
    items: [
      { label: 'Fee Component',    href: '/dashboard/masters/custom/fee_component',    icon: 'BarChart',    desc: 'Tuition, Lab, Sports, Transport and other fee line-item categories' },
      { label: 'Scholarship Type', href: '/dashboard/masters/custom/scholarship_type', icon: 'Layers',      desc: 'Merit, Sports, EWS, Staff Ward and other concession categories' },
      { label: 'Income Bracket',   href: '/dashboard/masters/custom/income_bracket',   icon: 'BarChart',    desc: 'Annual family income ranges used for scholarship eligibility' },
    ],
  },
  {
    title: 'Academic Boards',
    items: [
      { label: 'Board',              href: '/dashboard/masters/custom/board',              icon: 'BookMarked',    desc: 'CBSE, ICSE, IB, Cambridge — previous school board for admission tracking' },
      { label: 'IB Programme',       href: '/dashboard/masters/custom/ib_programme',       icon: 'GraduationCap', desc: 'PYP, MYP, DP, CP — IB programme stages for IB schools' },
      { label: 'Cambridge Pathway',  href: '/dashboard/masters/custom/cambridge_pathway',  icon: 'BookMarked',    desc: 'Primary, IGCSE, O-Level, A-Level — Cambridge curriculum stages' },
    ],
  },
  {
    title: 'Infrastructure & Relations',
    items: [
      { label: 'House',           href: '/dashboard/masters/custom/house',           icon: 'Building',    desc: 'School houses for inter-house competitions and points system' },
      { label: 'Transport Stop',  href: '/dashboard/masters/custom/transport_stop',  icon: 'MapPin',      desc: 'Bus stops with estimated pickup times for route management' },
      { label: 'Relationship',    href: '/dashboard/masters/custom/relationship',    icon: 'Heart',       desc: 'Father, Mother, Guardian — parent-student relationship types' },
      { label: 'CAS Category',    href: '/dashboard/masters/custom/cas_category',    icon: 'Layers',      desc: 'Creativity, Activity, Service — IB Diploma CAS portfolio categories' },
    ],
  },
];

const icons: Record<string, React.ReactNode> = {
  Users:         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Heart:         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  GraduationCap: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  BookMarked:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7l2 2 4-4"/></svg>,
  ClipboardCheck:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></svg>,
  BarChart:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  Megaphone:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 19-9-9 19-2-8-8-2z"/></svg>,
  CalendarStar:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m12 14 1 2h2l-1.5 1.5.5 2L12 18.5l-2 1 .5-2L9 16h2z"/></svg>,
  Globe:         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Map:           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  MapPin:        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Building:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/><path d="M9 7h.01M12 7h.01M15 7h.01M9 11h.01M15 11h.01"/></svg>,
  Network:       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4M5.8 17.3l4.5-4M18.2 17.3l-4.5-4"/></svg>,
  Calendar:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  FileText:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  ListOrdered:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>,
  Layers:        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  ShoppingBag:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  MessageCircle:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Shield:          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
};

const AVAILABLE_FORMS = FORM_DEFINITIONS.map(f => ({ id: f.id, label: f.label }));

export default function MastersPage() {
  const searchParams  = useSearchParams();
  const schoolId      = searchParams.get('schoolId');

  // Super-admin school picker (when no schoolId in URL)
  const [sa,        setSa]        = useState(false);
  const [saSchools, setSaSchools] = useState<any[]>([]);
  const [pickedId,  setPickedId]  = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const u = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
    if (!(u.primaryRole === 'super_admin' || u.roles?.some((r: any) => r.role_code === 'super_admin'))) return;
    setSa(true);
    if (!schoolId) {
      fetch('/api/super-admin/schools', { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.json()).then(d => setSaSchools(d.schools ?? []));
    }
  }, [schoolId]);

  const effectiveSchoolId = schoolId || pickedId;
  const suffix = effectiveSchoolId ? `?schoolId=${effectiveSchoolId}` : '';

  const [customTypes, setCustomTypes] = useState<any[]>([]);
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState({ name: '', description: '', formId: '', fieldSlot: '' });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [seeding, setSeeding]         = useState(false);
  const [seedResult, setSeedResult]   = useState('');

  const loadCustomTypes = useCallback(() => {
    const qs = effectiveSchoolId ? `?schoolId=${effectiveSchoolId}` : '';
    fetch(`/api/masters/custom${qs}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setCustomTypes(d.masterTypes ?? []))
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[custom-types]', err); });
  }, [effectiveSchoolId]);

  useEffect(() => { loadCustomTypes(); }, [loadCustomTypes]);

  const handleSeedStandard = async () => {
    setSeeding(true); setSeedResult('');
    try {
      const body: any = {};
      if (effectiveSchoolId) body.schoolId = effectiveSchoolId;
      const res  = await fetch('/api/masters/seed-standard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setSeedResult(data.error ?? 'Seed failed'); return; }
      setSeedResult(`Done — ${data.created} created, ${data.skipped} already existed.`);
      loadCustomTypes();
    } catch { setSeedResult('Network error'); }
    finally { setSeeding(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const body: any = { name: form.name, description: form.description };
      if (effectiveSchoolId) body.schoolId  = effectiveSchoolId;
      if (form.formId)       body.formId    = form.formId;
      if (form.fieldSlot) body.fieldSlot = form.fieldSlot;

      const res  = await fetch('/api/masters/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create'); return; }
      setShowModal(false);
      setForm({ name: '', description: '', formId: '', fieldSlot: '' });
      loadCustomTypes();
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Super-admin school picker — shown when no schoolId in URL */}
      {sa && !schoolId && (
        <div className="card p-5 flex items-center gap-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500 shrink-0"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h4"/></svg>
          <div className="flex-1">
            <p className="text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Managing masters for school</p>
            {saSchools.length === 0 ? (
              <p className="text-xs text-surface-400">Loading schools…</p>
            ) : (
              <select value={pickedId} onChange={e => { setPickedId(e.target.value); setCustomTypes([]); }} className={SEL_CLS}>
                <option value="">— choose a school to manage —</option>
                {saSchools.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
          {pickedId && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ {saSchools.find(s => s.id === pickedId)?.name}
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Masters</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
            Configure lookup data used across forms and workflows
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleSeedStandard}
              disabled={seeding}
              className="btn-secondary flex items-center gap-2 text-sm"
              title="Create all 22 standard master types with default values (idempotent)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
              {seeding ? 'Initializing…' : 'Init Standard Masters'}
            </button>
            {seedResult && <span className="text-xs text-emerald-600 dark:text-emerald-400">{seedResult}</span>}
          </div>
          <button
            onClick={() => { setShowModal(true); setError(''); }}
            className="btn-primary flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Master
          </button>
        </div>
      </div>

      {/* Built-in master sections */}
      {MASTER_SECTIONS.map((section) => (
        <div key={section.title}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-gray-500 mb-3">
            {section.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={`${item.href}${suffix}`}
                className="card p-4 flex items-start gap-3 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                  {icons[item.icon]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.label}</p>
                  <p className="text-xs text-surface-400 dark:text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                </div>
                <svg className="ml-auto shrink-0 text-surface-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Custom master types section */}
      {customTypes.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-gray-500 mb-3">
            Custom
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customTypes.map((ct) => (
              <Link
                key={ct.id}
                href={`/dashboard/masters/custom/${ct.slug}${suffix}`}
                className="card p-4 flex items-start gap-3 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-500 dark:text-purple-400 shrink-0 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                  {icons.Layers}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{ct.name}</p>
                  <p className="text-xs text-surface-400 dark:text-gray-500 mt-0.5 leading-snug">
                    {ct.description || `${ct._count?.values ?? 0} active values`}
                  </p>
                  {ct.formId && (
                    <p className="text-xs text-purple-400 dark:text-purple-500 mt-0.5">
                      Linked to: {AVAILABLE_FORMS.find(f => f.id === ct.formId)?.label ?? ct.formId}
                    </p>
                  )}
                </div>
                <svg className="ml-auto shrink-0 text-surface-300 dark:text-gray-600 group-hover:text-purple-400 transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Add Master Type modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md border border-surface-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-surface-100 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Create New Master Type</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 text-surface-400 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Master Name <span className="text-red-500">*</span></label>
                <input
                  className="input-field"
                  required
                  placeholder="e.g. Religion, Caste, Category"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
                <p className="text-xs text-surface-400 mt-1">This will be the name shown in the Masters menu.</p>
              </div>

              <div>
                <label className="label">Description</label>
                <input
                  className="input-field"
                  placeholder="e.g. Religion options for students"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Link to Form (optional)</label>
                <select
                  className="input-field"
                  value={form.formId}
                  onChange={e => setForm(p => ({ ...p, formId: e.target.value, fieldSlot: '' }))}
                >
                  <option value="">— Not linked to any form —</option>
                  {AVAILABLE_FORMS.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
                <p className="text-xs text-surface-400 mt-1">
                  If linked, this master's values will appear as a dropdown in that form.
                </p>
              </div>

              {form.formId && (
                <div>
                  <label className="label">Field Slot in Form</label>
                  <input
                    className="input-field"
                    placeholder="e.g. religion, caste, category"
                    value={form.fieldSlot}
                    onChange={e => setForm(p => ({ ...p, fieldSlot: e.target.value }))}
                  />
                  <p className="text-xs text-surface-400 mt-1">
                    The field identifier in the form where this dropdown will appear.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Creating…' : 'Create Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
