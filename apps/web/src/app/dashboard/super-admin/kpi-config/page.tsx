'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  KPI_DEFINITIONS, KPI_CATEGORIES, KPI_SEGMENTS,
  KpiDef, KpiCategory, KpiSegment,
} from '@/lib/kpiDefinitions';

// ── Types ────────────────────────────────────────────────────────────────────

interface School { id: string; name: string; }

interface KpiRowState {
  isEnabled:       boolean;
  targetValue:     number;
  targetDirection: 'above' | 'below';
  visibleToRoles:  string[] | null;
  formulaParams:   Record<string, number> | null;
  configId:        string | null;
  isDirty:         boolean;
}

interface RatingConfig {
  excellentMin:    number;
  goodMin:         number;
  averageMin:      number;
  belowAverageMin: number;
  behExcellentMax: number;
  behGoodMax:      number;
  behAverageMax:   number;
  behBelowAvgMax:  number;
  isDirty:         boolean;
}

interface EcoRatingConfig {
  ecoExcellentMin: number;
  ecoGoodMin:      number;
  ecoAverageMin:   number;
  ecoBelowAvgMin:  number;
  isDirty:         boolean;
}

interface RatingScaleBand {
  min:   number;
  max:   number;
  label: string;
  color: string;
}

interface CompositeConfig {
  weightAcademic:   number;
  weightAttendance: number;
  weightBehavior:   number;
  weightEco:        number;
  ratingScale:      RatingScaleBand[];
  isDirty:          boolean;
}

interface ExamTypeMaster {
  id: string; name: string; code: string; termOrder?: number; isActive: boolean;
}
interface GradingTypeMaster {
  id: string; grade: string; minPercent: number; maxPercent: number;
  gradePoints?: number; description?: string; isActive: boolean;
  examTypeId?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES = [
  { code: 'school_admin', label: 'Admin' },
  { code: 'principal',    label: 'Principal' },
  { code: 'hod',          label: 'HoD' },
  { code: 'teacher',      label: 'Teacher' },
  { code: 'parent',       label: 'Parent' },
  { code: 'student',      label: 'Student' },
];

const SEGMENT_ORDER: KpiSegment[] = ['academic_performance', 'attendance', 'behavior'];
const ACADEMIC_CATEGORY_ORDER: KpiCategory[] = [
  'student_performance', 'teacher_performance', 'operational', 'cocurricular', 'ai_smart',
];

const PAGE_TABS = [
  { id: 'kpi',         label: 'KPI Settings'  },
  { id: 'rating',      label: 'Rating Logic'  },
  { id: 'measurement', label: 'Measurement'   },
  { id: 'masters',     label: 'Masters'       },
] as const;
type PageTab = typeof PAGE_TABS[number]['id'];

const RATING_SEGMENTS = [
  { key: 'academic',   label: 'Academic Performance' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'behavior',   label: 'Behavior' },
];

const RATING_BANDS = ['Excellent', 'Good', 'Average', 'Below Average', 'Needs Improvement'];

const DEFAULT_RATING: Record<string, Omit<RatingConfig, 'isDirty'>> = {
  academic:   { excellentMin: 90, goodMin: 75, averageMin: 60, belowAverageMin: 40, behExcellentMax: 0, behGoodMax: 2, behAverageMax: 5, behBelowAvgMax: 10 },
  attendance: { excellentMin: 95, goodMin: 85, averageMin: 75, belowAverageMin: 60, behExcellentMax: 0, behGoodMax: 2, behAverageMax: 5, behBelowAvgMax: 10 },
  behavior:   { excellentMin: 90, goodMin: 75, averageMin: 60, belowAverageMin: 40, behExcellentMax: 0, behGoodMax: 2, behAverageMax: 5, behBelowAvgMax: 10 },
};

const DEFAULT_RATING_SCALE: RatingScaleBand[] = [
  { min: 90, max: 100, label: 'Outstanding',   color: '#22c55e' },
  { min: 75, max: 89,  label: 'Excellent',     color: '#84cc16' },
  { min: 60, max: 74,  label: 'Good',          color: '#eab308' },
  { min: 40, max: 59,  label: 'Average',       color: '#f97316' },
  { min:  0, max: 39,  label: 'Below Average', color: '#ef4444' },
];

const DEFAULT_ECO: Omit<EcoRatingConfig, 'isDirty'> = {
  ecoExcellentMin: 85, ecoGoodMin: 70, ecoAverageMin: 50, ecoBelowAvgMin: 30,
};

const DEFAULT_COMPOSITE: Omit<CompositeConfig, 'isDirty'> = {
  weightAcademic: 40, weightAttendance: 30, weightBehavior: 20, weightEco: 10,
  ratingScale: DEFAULT_RATING_SCALE,
};

function currentAcademicYear() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  return m >= 4 ? `${y}-${(y + 1).toString().slice(2)}` : `${y - 1}-${y.toString().slice(2)}`;
}
function academicYearOptions() {
  const base = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => {
    const y = base - 1 + i;
    return `${y}-${(y + 1).toString().slice(2)}`;
  });
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function KpiConfigPage() {
  const [schools,      setSchools]      = useState<School[]>([]);
  const [schoolId,     setSchoolId]     = useState('');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [pageTab,      setPageTab]      = useState<PageTab>('kpi');
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [savedOk,      setSavedOk]      = useState(false);
  const [msg,          setMsg]          = useState('');

  // KPI Settings state
  const [configs,        setConfigs]        = useState<Record<string, KpiRowState>>({});
  const [activeSegment,  setActiveSegment]  = useState<KpiSegment>('academic_performance');
  const [expandedCats,   setExpandedCats]   = useState<Set<string>>(
    new Set(['student_performance', 'attendance', 'discipline']),
  );
  const [expandedParams, setExpandedParams] = useState<Set<string>>(new Set());

  // Rating Logic state
  const [ratingConfigs,    setRatingConfigs]    = useState<Record<string, RatingConfig>>({});
  const [ecoConfig,        setEcoConfig]        = useState<EcoRatingConfig>({ ...DEFAULT_ECO, isDirty: false });
  const [compositeConfig,  setCompositeConfig]  = useState<CompositeConfig>({ ...DEFAULT_COMPOSITE, isDirty: false });

  // Masters state
  const [examTypes,    setExamTypes]    = useState<ExamTypeMaster[]>([]);
  const [gradingTypes, setGradingTypes] = useState<GradingTypeMaster[]>([]);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [newExamType,  setNewExamType]  = useState({ name: '', code: '', termOrder: '' });
  const [newGradingType, setNewGradingType] = useState({ examTypeId: '', grade: '', minPercent: '', maxPercent: '', gradePoints: '', description: '' });
  const [mastersMsg,   setMastersMsg]   = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Load schools ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/schools', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const list: School[] = d.schools ?? [];
        setSchools(list);
        if (list.length) setSchoolId(list[0].id);
      })
      .catch(() => {});
  }, []);

  // ── Load KPI configs ──────────────────────────────────────────────────────

  const loadKpis = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res  = await fetch(
        `/api/super-admin/kpi-config?schoolId=${schoolId}&academicYear=${academicYear}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      const next: Record<string, KpiRowState> = {};
      for (const k of (data.kpis ?? [])) {
        next[k.code] = {
          isEnabled:       k.isEnabled,
          targetValue:     k.targetValue,
          targetDirection: k.targetDirection,
          visibleToRoles:  k.visibleToRoles ?? null,
          formulaParams:   k.formulaParams  ?? null,
          configId:        k.configId,
          isDirty:         false,
        };
      }
      setConfigs(next);
    } finally { setLoading(false); }
  }, [schoolId, academicYear]);

  useEffect(() => { loadKpis(); }, [loadKpis]);

  // ── Load Rating configs ───────────────────────────────────────────────────

  const loadRatings = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res  = await fetch(
        `/api/super-admin/kpi-rating-config?schoolId=${schoolId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      const next: Record<string, RatingConfig> = {};
      for (const seg of RATING_SEGMENTS) {
        const stored = (data.configs ?? []).find((c: any) => c.segment === seg.key);
        next[seg.key] = { ...(DEFAULT_RATING[seg.key] as RatingConfig), ...stored, isDirty: false };
      }
      setRatingConfigs(next);

      const ecoCfg = (data.configs ?? []).find((c: any) => c.segment === 'extracurricular');
      if (ecoCfg) {
        setEcoConfig({
          ecoExcellentMin: ecoCfg.ecoExcellentMin ?? DEFAULT_ECO.ecoExcellentMin,
          ecoGoodMin:      ecoCfg.ecoGoodMin      ?? DEFAULT_ECO.ecoGoodMin,
          ecoAverageMin:   ecoCfg.ecoAverageMin   ?? DEFAULT_ECO.ecoAverageMin,
          ecoBelowAvgMin:  ecoCfg.ecoBelowAvgMin  ?? DEFAULT_ECO.ecoBelowAvgMin,
          isDirty: false,
        });
      }
      const compCfg = (data.configs ?? []).find((c: any) => c.segment === 'composite');
      if (compCfg) {
        setCompositeConfig({
          weightAcademic:   compCfg.weightAcademic   ?? DEFAULT_COMPOSITE.weightAcademic,
          weightAttendance: compCfg.weightAttendance ?? DEFAULT_COMPOSITE.weightAttendance,
          weightBehavior:   compCfg.weightBehavior   ?? DEFAULT_COMPOSITE.weightBehavior,
          weightEco:        compCfg.weightEco        ?? DEFAULT_COMPOSITE.weightEco,
          ratingScale:      (compCfg.ratingScale as RatingScaleBand[] | null) ?? DEFAULT_RATING_SCALE,
          isDirty: false,
        });
      }
    } catch { /* keep defaults */ }
  }, [schoolId]);

  useEffect(() => { loadRatings(); }, [loadRatings]);

  // ── Load Masters ──────────────────────────────────────────────────────────

  const loadMasters = useCallback(async () => {
    if (!schoolId) return;
    setMastersLoading(true);
    try {
      const [etRes, gtRes] = await Promise.all([
        fetch(`/api/masters/exam-types?schoolId=${schoolId}&includeInactive=true`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/masters/grading-types?schoolId=${schoolId}&includeInactive=true`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const etData = await etRes.json();
      const gtData = await gtRes.json();
      setExamTypes(etData.examTypes ?? []);
      setGradingTypes(gtData.gradingTypes ?? []);
    } finally { setMastersLoading(false); }
  }, [schoolId]);

  useEffect(() => {
    if (pageTab === 'masters') loadMasters();
  }, [pageTab, loadMasters]);

  // ── KPI helpers ───────────────────────────────────────────────────────────

  const updateConfig = (code: string, patch: Partial<KpiRowState>) => {
    setConfigs(prev => ({ ...prev, [code]: { ...prev[code], ...patch, isDirty: true } }));
  };
  const toggleRole = (code: string, role: string, defaultRoles: string[]) => {
    const current = configs[code]?.visibleToRoles ?? defaultRoles;
    const next    = current.includes(role) ? current.filter(r => r !== role) : [...current, role];
    updateConfig(code, { visibleToRoles: next });
  };
  const updateFormulaParam = (code: string, key: string, value: number) => {
    const existing = configs[code]?.formulaParams ?? {};
    updateConfig(code, { formulaParams: { ...existing, [key]: value } });
  };

  const saveKpis = async () => {
    const dirty = Object.entries(configs)
      .filter(([, v]) => v.isDirty)
      .map(([code, v]) => ({
        kpiCode: code, isEnabled: v.isEnabled, targetValue: v.targetValue,
        targetDirection: v.targetDirection, visibleToRoles: v.visibleToRoles,
        formulaParams: v.formulaParams,
      }));
    if (!dirty.length) return;
    setSaving(true);
    const res = await fetch('/api/super-admin/kpi-config', {
      method: 'PATCH', headers, body: JSON.stringify({ schoolId, academicYear, configs: dirty }),
    });
    if (res.ok) { setSavedOk(true); setTimeout(() => setSavedOk(false), 2500); await loadKpis(); }
    setSaving(false);
  };

  // ── Rating helpers ────────────────────────────────────────────────────────

  const updateRating = (segment: string, field: string, value: number) => {
    setRatingConfigs(prev => ({
      ...prev,
      [segment]: { ...prev[segment], [field]: value, isDirty: true },
    }));
  };

  const updateRatingScaleBand = (i: number, field: keyof RatingScaleBand, value: string | number) => {
    setCompositeConfig(prev => {
      const scale = [...prev.ratingScale];
      scale[i] = { ...scale[i], [field]: value };
      return { ...prev, ratingScale: scale, isDirty: true };
    });
  };

  const saveRatings = async () => {
    const dirty: any[] = Object.entries(ratingConfigs)
      .filter(([, v]) => v.isDirty)
      .map(([segment, v]) => ({ segment, ...v }));

    if (ecoConfig.isDirty) {
      dirty.push({
        segment:         'extracurricular',
        ecoExcellentMin: ecoConfig.ecoExcellentMin,
        ecoGoodMin:      ecoConfig.ecoGoodMin,
        ecoAverageMin:   ecoConfig.ecoAverageMin,
        ecoBelowAvgMin:  ecoConfig.ecoBelowAvgMin,
      });
    }

    if (compositeConfig.isDirty) {
      const total = compositeConfig.weightAcademic + compositeConfig.weightAttendance +
                    compositeConfig.weightBehavior  + compositeConfig.weightEco;
      if (total !== 100) {
        setMsg(`Composite weights must sum to 100 (current: ${total})`);
        setTimeout(() => setMsg(''), 3000);
        return;
      }
      dirty.push({
        segment:          'composite',
        weightAcademic:   compositeConfig.weightAcademic,
        weightAttendance: compositeConfig.weightAttendance,
        weightBehavior:   compositeConfig.weightBehavior,
        weightEco:        compositeConfig.weightEco,
        ratingScale:      compositeConfig.ratingScale,
      });
    }

    if (!dirty.length) return;
    setSaving(true);
    const res = await fetch('/api/super-admin/kpi-rating-config', {
      method: 'POST', headers, body: JSON.stringify({ schoolId, configs: dirty }),
    });
    if (res.ok) {
      setMsg('Rating config saved.');
      setTimeout(() => setMsg(''), 2500);
      await loadRatings();
    }
    setSaving(false);
  };

  // ── Masters helpers ───────────────────────────────────────────────────────

  const addExamType = async () => {
    if (!newExamType.name || !newExamType.code) return;
    const res = await fetch('/api/masters/exam-types', {
      method: 'POST', headers,
      body: JSON.stringify({ schoolId, name: newExamType.name, code: newExamType.code, termOrder: newExamType.termOrder ? Number(newExamType.termOrder) : undefined }),
    });
    if (res.ok) {
      setNewExamType({ name: '', code: '', termOrder: '' });
      setMastersMsg('Exam type added.');
      setTimeout(() => setMastersMsg(''), 2000);
      loadMasters();
    }
  };

  const toggleExamType = async (id: string, isActive: boolean) => {
    await fetch('/api/masters/exam-types', { method: 'PATCH', headers, body: JSON.stringify({ id, isActive }) });
    loadMasters();
  };

  const addGradingType = async () => {
    const d = newGradingType;
    if (!d.examTypeId || !d.grade || !d.minPercent || !d.maxPercent) return;
    const res = await fetch('/api/masters/grading-types', {
      method: 'POST', headers,
      body: JSON.stringify({
        schoolId, examTypeId: d.examTypeId, grade: d.grade,
        minPercent: Number(d.minPercent), maxPercent: Number(d.maxPercent),
        gradePoints: d.gradePoints ? Number(d.gradePoints) : undefined,
        description: d.description || undefined,
      }),
    });
    if (res.ok) {
      setNewGradingType({ examTypeId: '', grade: '', minPercent: '', maxPercent: '', gradePoints: '', description: '' });
      setMastersMsg('Grade added.');
      setTimeout(() => setMastersMsg(''), 2000);
      loadMasters();
    }
  };

  const toggleGradingType = async (id: string, isActive: boolean) => {
    await fetch('/api/masters/grading-types', { method: 'PATCH', headers, body: JSON.stringify({ id, isActive }) });
    loadMasters();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const dirtyKpiCount    = Object.values(configs).filter(v => v.isDirty).length;
  const dirtyRatingCount = Object.values(ratingConfigs).filter(v => v.isDirty).length
    + (ecoConfig.isDirty ? 1 : 0) + (compositeConfig.isDirty ? 1 : 0);

  const segmentCategoryOrder = activeSegment === 'academic_performance'
    ? ACADEMIC_CATEGORY_ORDER
    : KPI_SEGMENTS[activeSegment].categories;

  const kpisByCategory: Record<string, KpiDef[]> = {};
  for (const def of KPI_DEFINITIONS) {
    if (def.segment !== activeSegment) continue;
    if (!kpisByCategory[def.category]) kpisByCategory[def.category] = [];
    kpisByCategory[def.category].push(def);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Global header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900">Performance Module Setup</h1>
            <p className="text-sm text-gray-500 mt-0.5">Configure KPIs, rating logic, measurement, and masters per school</p>
          </div>

          <select
            value={schoolId}
            onChange={e => setSchoolId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">Select school…</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select
            value={academicYear}
            onChange={e => setAcademicYear(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {academicYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── Page tabs ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-0">
          {PAGE_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setPageTab(t.id)}
              className={`
                px-5 py-3 text-sm font-medium border-b-2 transition-colors
                ${pageTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {t.label}
              {t.id === 'kpi'    && dirtyKpiCount    > 0 && <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 rounded-full">{dirtyKpiCount}</span>}
              {t.id === 'rating' && dirtyRatingCount > 0 && <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 rounded-full">{dirtyRatingCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">{msg}</div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ═══════════════════════════════ KPI Settings ═══════════════════════ */}
        {pageTab === 'kpi' && (
          <>
            <div className="flex items-center justify-between mb-5">
              {/* Segment tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {SEGMENT_ORDER.map(seg => (
                  <button
                    key={seg}
                    onClick={() => setActiveSegment(seg)}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeSegment === seg ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {KPI_SEGMENTS[seg].label}
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({KPI_DEFINITIONS.filter(k => k.segment === seg).length})
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={saveKpis}
                disabled={saving || dirtyKpiCount === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  savedOk ? 'bg-green-600 text-white' : dirtyKpiCount > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {savedOk ? 'Saved ✓' : saving ? 'Saving…' : `Save KPI Changes${dirtyKpiCount > 0 ? ` (${dirtyKpiCount})` : ''}`}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading KPI configuration…
              </div>
            ) : (
              <div className="space-y-4">
                {segmentCategoryOrder
                  .filter(cat => kpisByCategory[cat]?.length)
                  .map(cat => (
                    <CategorySection
                      key={cat}
                      category={cat}
                      kpis={kpisByCategory[cat] ?? []}
                      configs={configs}
                      expanded={expandedCats.has(cat)}
                      onToggleExpand={() => {
                        setExpandedCats(prev => {
                          const next = new Set(prev);
                          next.has(cat) ? next.delete(cat) : next.add(cat);
                          return next;
                        });
                      }}
                      expandedParams={expandedParams}
                      onToggleParams={code => {
                        setExpandedParams(prev => {
                          const next = new Set(prev);
                          next.has(code) ? next.delete(code) : next.add(code);
                          return next;
                        });
                      }}
                      onToggleEnabled={code => updateConfig(code, { isEnabled: !configs[code]?.isEnabled })}
                      onTargetChange={(code, v) => updateConfig(code, { targetValue: v })}
                      onDirectionChange={(code, v) => updateConfig(code, { targetDirection: v })}
                      onToggleRole={toggleRole}
                      onFormulaParamChange={updateFormulaParam}
                    />
                  ))}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════ Rating Logic ═══════════════════════ */}
        {pageTab === 'rating' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Rating Logic Configuration</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Set the thresholds for each rating band. These are used when generating report cards.
                </p>
              </div>
              <button
                onClick={saveRatings}
                disabled={saving || dirtyRatingCount === 0}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dirtyRatingCount > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? 'Saving…' : `Save Rating Config${dirtyRatingCount > 0 ? ` (${dirtyRatingCount})` : ''}`}
              </button>
            </div>

            {RATING_SEGMENTS.map(seg => {
              const cfg = ratingConfigs[seg.key] ?? { ...DEFAULT_RATING[seg.key], isDirty: false };
              const isBehavior = seg.key === 'behavior';
              return (
                <div key={seg.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-medium text-gray-900">{seg.label}</h3>
                    <span className="text-xs text-gray-400">
                      {isBehavior ? 'Based on negative incident count (lower = better)' : 'Based on percentage score (higher = better)'}
                    </span>
                  </div>
                  <div className="p-5">
                    {isBehavior ? (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500 mb-3">Enter the maximum number of negative incidents allowed for each rating.</p>
                        {[
                          { label: 'Excellent',      field: 'behExcellentMax', color: 'text-emerald-600' },
                          { label: 'Good',           field: 'behGoodMax',      color: 'text-blue-600' },
                          { label: 'Average',        field: 'behAverageMax',   color: 'text-amber-600' },
                          { label: 'Below Average',  field: 'behBelowAvgMax',  color: 'text-orange-600' },
                        ].map(band => (
                          <div key={band.field} className="flex items-center gap-4">
                            <span className={`w-28 text-sm font-medium ${band.color}`}>{band.label}</span>
                            <span className="text-sm text-gray-500">Max incidents ≤</span>
                            <input
                              type="number"
                              min={0}
                              value={(cfg as any)[band.field] ?? 0}
                              onChange={e => updateRating(seg.key, band.field, Number(e.target.value))}
                              className="w-20 text-sm border border-gray-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          </div>
                        ))}
                        <div className="flex items-center gap-4 opacity-60">
                          <span className="w-28 text-sm font-medium text-red-600">Needs Improvement</span>
                          <span className="text-sm text-gray-500">More than behBelowAvgMax incidents</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500 mb-3">Enter the minimum percentage score required for each rating.</p>
                        {[
                          { label: 'Excellent',      field: 'excellentMin',    color: 'text-emerald-600' },
                          { label: 'Good',           field: 'goodMin',         color: 'text-blue-600' },
                          { label: 'Average',        field: 'averageMin',      color: 'text-amber-600' },
                          { label: 'Below Average',  field: 'belowAverageMin', color: 'text-orange-600' },
                        ].map(band => (
                          <div key={band.field} className="flex items-center gap-4">
                            <span className={`w-28 text-sm font-medium ${band.color}`}>{band.label}</span>
                            <span className="text-sm text-gray-500">Score ≥</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={(cfg as any)[band.field] ?? 0}
                              onChange={e => updateRating(seg.key, band.field, Number(e.target.value))}
                              className="w-20 text-sm border border-gray-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                            <span className="text-xs text-gray-400">%</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-4 opacity-60">
                          <span className="w-28 text-sm font-medium text-red-600">Needs Improvement</span>
                          <span className="text-sm text-gray-500">Below belowAverageMin threshold</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* ── ECO (Extracurricular) thresholds ───────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">Extracurricular (ECO)</h3>
                <span className="text-xs text-gray-400">Points threshold → rating (higher is better)</span>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-gray-500 mb-3">Minimum ECO points required for each rating band.</p>
                {[
                  { label: 'Excellent',     field: 'ecoExcellentMin', color: 'text-emerald-600' },
                  { label: 'Good',          field: 'ecoGoodMin',      color: 'text-blue-600' },
                  { label: 'Average',       field: 'ecoAverageMin',   color: 'text-amber-600' },
                  { label: 'Below Average', field: 'ecoBelowAvgMin',  color: 'text-orange-600' },
                ].map(band => (
                  <div key={band.field} className="flex items-center gap-4">
                    <span className={`w-28 text-sm font-medium ${band.color}`}>{band.label}</span>
                    <span className="text-sm text-gray-500">Points ≥</span>
                    <input
                      type="number" min={0}
                      value={(ecoConfig as any)[band.field] ?? 0}
                      onChange={e => setEcoConfig(prev => ({ ...prev, [band.field]: Number(e.target.value), isDirty: true }))}
                      className="w-20 text-sm border border-gray-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-4 opacity-60">
                  <span className="w-28 text-sm font-medium text-red-600">Needs Improvement</span>
                  <span className="text-sm text-gray-500">Below ecoBelowAvgMin threshold</span>
                </div>
              </div>
            </div>

            {/* ── Composite weights + rating scale ───────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">Composite Score Weights</h3>
                {(() => {
                  const total = compositeConfig.weightAcademic + compositeConfig.weightAttendance + compositeConfig.weightBehavior + compositeConfig.weightEco;
                  return (
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${total === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      Total: {total}% {total === 100 ? '✓' : '(must equal 100)'}
                    </span>
                  );
                })()}
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Academic',              field: 'weightAcademic' },
                    { label: 'Attendance',            field: 'weightAttendance' },
                    { label: 'Behavior',              field: 'weightBehavior' },
                    { label: 'Extracurricular (ECO)', field: 'weightEco' },
                  ].map(w => (
                    <div key={w.field} className="flex items-center gap-3">
                      <label className="w-40 text-sm text-gray-700">{w.label}</label>
                      <input
                        type="number" min={0} max={100}
                        value={(compositeConfig as any)[w.field] ?? 0}
                        onChange={e => setCompositeConfig(prev => ({ ...prev, [w.field]: Number(e.target.value), isDirty: true }))}
                        className="w-20 text-sm border border-gray-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-3">Composite Rating Scale</h4>
                  <div className="grid grid-cols-[60px_12px_60px_1fr_36px] gap-2 items-center text-xs text-gray-500 font-medium mb-1 px-1">
                    <span>Min</span><span></span><span>Max</span><span>Label</span><span>Color</span>
                  </div>
                  <div className="space-y-2">
                    {compositeConfig.ratingScale.map((band, i) => (
                      <div key={i} className="grid grid-cols-[60px_12px_60px_1fr_36px] gap-2 items-center">
                        <input
                          type="number" min={0} max={100} value={band.min}
                          onChange={e => updateRatingScaleBand(i, 'min', Number(e.target.value))}
                          className="text-sm border border-gray-300 rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <span className="text-center text-gray-400">–</span>
                        <input
                          type="number" min={0} max={100} value={band.max}
                          onChange={e => updateRatingScaleBand(i, 'max', Number(e.target.value))}
                          className="text-sm border border-gray-300 rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <input
                          value={band.label}
                          onChange={e => updateRatingScaleBand(i, 'label', e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          placeholder="Label"
                        />
                        <input
                          type="color" value={band.color}
                          onChange={e => updateRatingScaleBand(i, 'color', e.target.value)}
                          className="w-8 h-8 border border-gray-300 rounded cursor-pointer p-0.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ Measurement ════════════════════════ */}
        {pageTab === 'measurement' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Measurement Configuration</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Configure how data is measured and evaluated for this school. Grading system and exam types are managed in the Masters tab.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              <div className="px-5 py-4">
                <h3 className="font-medium text-gray-900 mb-3">Academic Year Pattern</h3>
                <div className="flex items-center gap-3">
                  <select
                    value={academicYear}
                    onChange={e => setAcademicYear(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {academicYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <span className="text-sm text-gray-500">Currently active year for KPI calculations</span>
                </div>
              </div>

              <div className="px-5 py-4">
                <h3 className="font-medium text-gray-900 mb-2">Grading System</h3>
                <p className="text-sm text-gray-500 mb-3">
                  The grading system (marks, grade letters, percentage) is defined per exam type in the <strong>Masters</strong> tab.
                  Each exam type can have its own grading scale.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
                  Go to <strong>Masters → Grading Types</strong> to configure grade bands (A, B, C… or 90–100%, etc.) per exam type.
                </div>
              </div>

              <div className="px-5 py-4">
                <h3 className="font-medium text-gray-900 mb-2">Passing Criteria</h3>
                <p className="text-sm text-gray-500 mb-3">
                  The pass/fail threshold is configured per exam type via the <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">pass_percentage</code> KPI formula parameter in <strong>KPI Settings → Academic Performance → Student Performance</strong>.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                  Set the passing percentage threshold in KPI Settings → <em>pass_percentage</em> formula params.
                </div>
              </div>

              <div className="px-5 py-4">
                <h3 className="font-medium text-gray-900 mb-2">Report Card Sections</h3>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  {RATING_SEGMENTS.map(seg => {
                    const cfg = ratingConfigs[seg.key];
                    return (
                      <div key={seg.key} className="bg-gray-50 rounded-lg p-3 text-sm">
                        <p className="font-medium text-gray-700 mb-1">{seg.label}</p>
                        {seg.key === 'behavior' ? (
                          <ul className="text-xs text-gray-500 space-y-0.5">
                            <li>Excellent: ≤ {cfg?.behExcellentMax ?? 0} incidents</li>
                            <li>Good: ≤ {cfg?.behGoodMax ?? 2} incidents</li>
                            <li>Average: ≤ {cfg?.behAverageMax ?? 5} incidents</li>
                            <li>Below Avg: ≤ {cfg?.behBelowAvgMax ?? 10} incidents</li>
                          </ul>
                        ) : (
                          <ul className="text-xs text-gray-500 space-y-0.5">
                            <li>Excellent: ≥ {cfg?.excellentMin ?? DEFAULT_RATING[seg.key].excellentMin}%</li>
                            <li>Good: ≥ {cfg?.goodMin ?? DEFAULT_RATING[seg.key].goodMin}%</li>
                            <li>Average: ≥ {cfg?.averageMin ?? DEFAULT_RATING[seg.key].averageMin}%</li>
                            <li>Below Avg: ≥ {cfg?.belowAverageMin ?? DEFAULT_RATING[seg.key].belowAverageMin}%</li>
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ Masters ════════════════════════════ */}
        {pageTab === 'masters' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Masters Management</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage exam types and grading bands for this school. These populate dropdowns across the platform — no values are hardcoded.
              </p>
            </div>

            {mastersMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">{mastersMsg}</div>
            )}

            {mastersLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-8">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading masters…
              </div>
            ) : (
              <>
                {/* Exam Types */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Exam Types</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Types of exams/tests (e.g. Unit Test, Mid-Term). Used in exam creation dropdowns.</p>
                    </div>
                    <span className="text-xs text-gray-400">{examTypes.length} types</span>
                  </div>

                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-2 text-left">Name</th>
                        <th className="px-5 py-2 text-left">Code</th>
                        <th className="px-5 py-2 text-center">Order</th>
                        <th className="px-5 py-2 text-center">Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {examTypes.map(et => (
                        <tr key={et.id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-2 font-medium">{et.name}</td>
                          <td className="px-5 py-2 font-mono text-xs text-gray-500">{et.code}</td>
                          <td className="px-5 py-2 text-center text-gray-500">{et.termOrder ?? '—'}</td>
                          <td className="px-5 py-2 text-center">
                            <button
                              onClick={() => toggleExamType(et.id, !et.isActive)}
                              className={`w-9 h-5 rounded-full transition-colors ${et.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                            >
                              <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${et.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50/40">
                        <td className="px-5 py-2">
                          <input placeholder="e.g. Half Yearly" value={newExamType.name}
                            onChange={e => setNewExamType(p => ({ ...p, name: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                        <td className="px-5 py-2">
                          <input placeholder="e.g. half_yearly" value={newExamType.code}
                            onChange={e => setNewExamType(p => ({ ...p, code: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                        <td className="px-5 py-2">
                          <input type="number" placeholder="Order" value={newExamType.termOrder}
                            onChange={e => setNewExamType(p => ({ ...p, termOrder: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-20 text-center focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                        <td className="px-5 py-2 text-center">
                          <button onClick={addExamType}
                            className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors">
                            Add
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Grading Types */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Grading Scale</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Grade bands per exam type (A → 90–100%, B → 75–89%…). Used in result entry and report cards.</p>
                    </div>
                    <span className="text-xs text-gray-400">{gradingTypes.length} bands</span>
                  </div>

                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-2 text-left">Exam Type</th>
                        <th className="px-5 py-2 text-left">Grade</th>
                        <th className="px-5 py-2 text-center">Min %</th>
                        <th className="px-5 py-2 text-center">Max %</th>
                        <th className="px-5 py-2 text-left">Description</th>
                        <th className="px-5 py-2 text-center">Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {gradingTypes.map(gt => {
                        const et = examTypes.find(e => e.id === gt.examTypeId);
                        return (
                          <tr key={gt.id} className="hover:bg-gray-50/50">
                            <td className="px-5 py-2 text-xs text-gray-500">{et?.name ?? '—'}</td>
                            <td className="px-5 py-2 font-medium">{gt.grade}</td>
                            <td className="px-5 py-2 text-center">{gt.minPercent}</td>
                            <td className="px-5 py-2 text-center">{gt.maxPercent}</td>
                            <td className="px-5 py-2 text-gray-500 text-xs">{gt.description ?? '—'}</td>
                            <td className="px-5 py-2 text-center">
                              <button
                                onClick={() => toggleGradingType(gt.id, !gt.isActive)}
                                className={`w-9 h-5 rounded-full transition-colors ${gt.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                              >
                                <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${gt.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-blue-50/40">
                        <td className="px-5 py-2">
                          <select value={newGradingType.examTypeId}
                            onChange={e => setNewGradingType(p => ({ ...p, examTypeId: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400">
                            <option value="">Select type…</option>
                            {examTypes.filter(et => et.isActive).map(et => (
                              <option key={et.id} value={et.id}>{et.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-2">
                          <input placeholder="A+" value={newGradingType.grade}
                            onChange={e => setNewGradingType(p => ({ ...p, grade: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-16 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                        <td className="px-5 py-2">
                          <input type="number" placeholder="90" value={newGradingType.minPercent}
                            onChange={e => setNewGradingType(p => ({ ...p, minPercent: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-16 text-center focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                        <td className="px-5 py-2">
                          <input type="number" placeholder="100" value={newGradingType.maxPercent}
                            onChange={e => setNewGradingType(p => ({ ...p, maxPercent: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-16 text-center focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                        <td className="px-5 py-2">
                          <input placeholder="Description" value={newGradingType.description}
                            onChange={e => setNewGradingType(p => ({ ...p, description: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                        <td className="px-5 py-2 text-center">
                          <button onClick={addGradingType}
                            className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors">
                            Add
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CategorySection ──────────────────────────────────────────────────────────

interface CategorySectionProps {
  category:           KpiCategory;
  kpis:               KpiDef[];
  configs:            Record<string, KpiRowState>;
  expanded:           boolean;
  onToggleExpand:     () => void;
  expandedParams:     Set<string>;
  onToggleParams:     (code: string) => void;
  onToggleEnabled:    (code: string) => void;
  onTargetChange:     (code: string, v: number) => void;
  onDirectionChange:  (code: string, v: 'above' | 'below') => void;
  onToggleRole:       (code: string, role: string, defaults: string[]) => void;
  onFormulaParamChange: (code: string, key: string, v: number) => void;
}

function CategorySection({
  category, kpis, configs, expanded, onToggleExpand,
  expandedParams, onToggleParams,
  onToggleEnabled, onTargetChange, onDirectionChange, onToggleRole, onFormulaParamChange,
}: CategorySectionProps) {
  const enabledCount = kpis.filter(k => configs[k.code]?.isEnabled !== false).length;
  const dirtyCount   = kpis.filter(k => configs[k.code]?.isDirty).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-gray-900">{KPI_CATEGORIES[category]}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{enabledCount} / {kpis.length} enabled</span>
          {dirtyCount > 0 && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{dirtyCount} unsaved</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="grid grid-cols-[1fr_80px_150px_280px_auto] gap-4 px-5 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>KPI</span>
            <span>Enabled</span>
            <span>Target</span>
            <span>Visible to Roles</span>
            <span>Formula</span>
          </div>

          {kpis.map((def, i) => (
            <KpiRow
              key={def.code}
              def={def}
              state={configs[def.code]}
              isLast={i === kpis.length - 1}
              paramsExpanded={expandedParams.has(def.code)}
              onToggleParams={() => onToggleParams(def.code)}
              onToggleEnabled={() => onToggleEnabled(def.code)}
              onTargetChange={v  => onTargetChange(def.code, v)}
              onDirectionChange={v => onDirectionChange(def.code, v)}
              onToggleRole={(role) => onToggleRole(def.code, role, def.visibleTo)}
              onFormulaParamChange={(key, v) => onFormulaParamChange(def.code, key, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── KpiRow ───────────────────────────────────────────────────────────────────

interface KpiRowProps {
  def:                  KpiDef;
  state:                KpiRowState | undefined;
  isLast:               boolean;
  paramsExpanded:       boolean;
  onToggleParams:       () => void;
  onToggleEnabled:      () => void;
  onTargetChange:       (v: number) => void;
  onDirectionChange:    (v: 'above' | 'below') => void;
  onToggleRole:         (role: string) => void;
  onFormulaParamChange: (key: string, v: number) => void;
}

function KpiRow({
  def, state, isLast, paramsExpanded, onToggleParams,
  onToggleEnabled, onTargetChange, onDirectionChange, onToggleRole, onFormulaParamChange,
}: KpiRowProps) {
  const enabled        = state?.isEnabled ?? true;
  const target         = state?.targetValue ?? def.defaultTarget;
  const direction      = state?.targetDirection ?? def.targetDirection;
  const effectiveRoles = state?.visibleToRoles ?? def.visibleTo;
  const hasFormula     = (def.formulaParamDefs?.length ?? 0) > 0;

  return (
    <>
      <div className={`
        grid grid-cols-[1fr_80px_150px_280px_auto] gap-4 px-5 py-3 items-center
        ${!isLast ? 'border-b border-gray-50' : ''}
        ${state?.isDirty ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}
        ${!enabled ? 'opacity-50' : ''}
        transition-colors
      `}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{def.name}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{def.unit}</span>
            {state?.isDirty && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate pr-4">{def.description}</p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onToggleEnabled}
            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={direction}
            onChange={e => onDirectionChange(e.target.value as 'above' | 'below')}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="above">&gt;</option>
            <option value="below">&lt;</option>
          </select>
          <input
            type="number"
            value={target}
            onChange={e => onTargetChange(Number(e.target.value))}
            className="w-20 text-sm border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-xs text-gray-400 flex-shrink-0">{def.unit}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {ALL_ROLES.map(r => {
            const active    = effectiveRoles.includes(r.code);
            const isDefault = def.visibleTo.includes(r.code);
            return (
              <button
                key={r.code}
                onClick={() => onToggleRole(r.code)}
                title={!isDefault && !active ? 'Not in definition default' : undefined}
                className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all ${
                  active ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          {hasFormula ? (
            <button
              onClick={onToggleParams}
              title="Configure formula parameters"
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-all ${
                paramsExpanded ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Formula
            </button>
          ) : (
            <span className="text-xs text-gray-300 px-2">—</span>
          )}
        </div>
      </div>

      {hasFormula && paramsExpanded && (
        <div className="px-5 pb-3 bg-amber-50/50 border-b border-amber-100">
          <div className="flex flex-wrap gap-4 pt-2">
            {def.formulaParamDefs!.map(p => {
              const val = (state?.formulaParams ?? {})[p.key] ?? p.defaultValue;
              return (
                <div key={p.key} className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 whitespace-nowrap">{p.label}</label>
                  <input
                    type="number"
                    value={val}
                    min={p.min}
                    max={p.max}
                    onChange={e => onFormulaParamChange(p.key, Number(e.target.value))}
                    className="w-20 text-sm border border-amber-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                  />
                  {p.unit && <span className="text-xs text-gray-400">{p.unit}</span>}
                  <span className="text-xs text-gray-400">(default: {p.defaultValue})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
