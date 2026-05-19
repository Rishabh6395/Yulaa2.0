'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompositeWeights {
  academic:   number;
  attendance: number;
  behavior:   number;
  eco:        number;
}

interface SegmentThresholds {
  segment:         string;
  // academic / attendance / eco
  excellentMin:    number;
  goodMin:         number;
  averageMin:      number;
  belowAverageMin: number;
  // behavior (lower = better)
  behExcellentMax: number;
  behGoodMax:      number;
  behAverageMax:   number;
  behBelowAvgMax:  number;
  // eco
  ecoExcellentMin: number;
  ecoGoodMin:      number;
  ecoAverageMin:   number;
  ecoBelowAvgMin:  number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NumInput({
  label, value, onChange, min = 0, max = 100, step = 5,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range" min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 accent-brand-500 h-1.5"
        />
        <input
          type="number" min={min} max={max}
          value={value}
          onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
          className="w-16 input text-center text-sm py-1"
        />
      </div>
    </div>
  );
}

function SaveBar({ saving, saved, error, onSave }: { saving: boolean; saved: boolean; error: string; onSave: () => void }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button onClick={onSave} disabled={saving} className="btn btn-primary">
        {saving ? 'Saving…' : 'Save'}
      </button>
      {saved  && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Saved!</span>}
      {error  && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerformanceConfigPage() {
  const { id: schoolId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);

  // ── Composite weights ──────────────────────────────────────────────────────
  const [weights, setWeights] = useState<CompositeWeights>({
    academic: 40, attendance: 30, behavior: 20, eco: 10,
  });
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightSaved,  setWeightSaved]  = useState(false);
  const [weightError,  setWeightError]  = useState('');
  const weightSum = weights.academic + weights.attendance + weights.behavior + weights.eco;

  // ── Per-segment thresholds ─────────────────────────────────────────────────
  const [thresholds, setThresholds] = useState<Record<string, SegmentThresholds>>({
    academic: {
      segment: 'academic', excellentMin: 90, goodMin: 75, averageMin: 60, belowAverageMin: 40,
      behExcellentMax: 0, behGoodMax: 2, behAverageMax: 5, behBelowAvgMax: 10,
      ecoExcellentMin: 85, ecoGoodMin: 70, ecoAverageMin: 50, ecoBelowAvgMin: 30,
    },
    attendance: {
      segment: 'attendance', excellentMin: 95, goodMin: 85, averageMin: 75, belowAverageMin: 60,
      behExcellentMax: 0, behGoodMax: 2, behAverageMax: 5, behBelowAvgMax: 10,
      ecoExcellentMin: 85, ecoGoodMin: 70, ecoAverageMin: 50, ecoBelowAvgMin: 30,
    },
    behavior: {
      segment: 'behavior', excellentMin: 90, goodMin: 75, averageMin: 60, belowAverageMin: 40,
      behExcellentMax: 0, behGoodMax: 2, behAverageMax: 5, behBelowAvgMax: 10,
      ecoExcellentMin: 85, ecoGoodMin: 70, ecoAverageMin: 50, ecoBelowAvgMin: 30,
    },
    extracurricular: {
      segment: 'extracurricular', excellentMin: 90, goodMin: 75, averageMin: 60, belowAverageMin: 40,
      behExcellentMax: 0, behGoodMax: 2, behAverageMax: 5, behBelowAvgMax: 10,
      ecoExcellentMin: 85, ecoGoodMin: 70, ecoAverageMin: 50, ecoBelowAvgMin: 30,
    },
  });
  const [threshSaving, setThreshSaving] = useState(false);
  const [threshSaved,  setThreshSaved]  = useState(false);
  const [threshError,  setThreshError]  = useState('');

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [perfRes, ratingRes] = await Promise.all([
        fetch(`/api/super-admin/performance-config?school_id=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/super-admin/kpi-rating-config?schoolId=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (perfRes.ok) {
        const d = await perfRes.json();
        if (d.compositeWeights) {
          setWeights({
            academic:   d.compositeWeights.academic   ?? 40,
            attendance: d.compositeWeights.attendance ?? 30,
            behavior:   d.compositeWeights.behavior   ?? 20,
            eco:        d.compositeWeights.eco        ?? 10,
          });
        }
      }

      if (ratingRes.ok) {
        const d = await ratingRes.json();
        const configs: any[] = d.configs ?? [];
        const updated: Record<string, SegmentThresholds> = { ...thresholds };
        for (const c of configs) {
          if (c.segment && updated[c.segment]) {
            updated[c.segment] = { ...updated[c.segment], ...c };
          }
        }
        setThresholds(updated);
      }
    } catch {
      // use defaults on error
    } finally {
      setLoading(false);
    }
  }, [schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // ── Save composite weights ─────────────────────────────────────────────────
  async function saveWeights() {
    if (weightSum !== 100) { setWeightError(`Weights must sum to 100 (currently ${weightSum})`); return; }
    setWeightSaving(true); setWeightError(''); setWeightSaved(false);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/super-admin/performance-config?school_id=${schoolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          weightAcademic:   weights.academic,
          weightAttendance: weights.attendance,
          weightBehavior:   weights.behavior,
          weightEco:        weights.eco,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Save failed'); }
      setWeightSaved(true);
      setTimeout(() => setWeightSaved(false), 2500);
    } catch (e: any) {
      setWeightError(e.message ?? 'Save failed');
    } finally {
      setWeightSaving(false);
    }
  }

  // ── Save KPI thresholds ────────────────────────────────────────────────────
  async function saveThresholds() {
    setThreshSaving(true); setThreshError(''); setThreshSaved(false);
    const token = localStorage.getItem('token');
    try {
      const configs = Object.values(thresholds).map(t => ({
        segment:         t.segment,
        excellentMin:    t.excellentMin,
        goodMin:         t.goodMin,
        averageMin:      t.averageMin,
        belowAverageMin: t.belowAverageMin,
        behExcellentMax: t.behExcellentMax,
        behGoodMax:      t.behGoodMax,
        behAverageMax:   t.behAverageMax,
        behBelowAvgMax:  t.behBelowAvgMax,
        ecoExcellentMin: t.ecoExcellentMin,
        ecoGoodMin:      t.ecoGoodMin,
        ecoAverageMin:   t.ecoAverageMin,
        ecoBelowAvgMin:  t.ecoBelowAvgMin,
      }));
      const res = await fetch('/api/super-admin/kpi-rating-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ schoolId, configs }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Save failed'); }
      setThreshSaved(true);
      setTimeout(() => setThreshSaved(false), 2500);
    } catch (e: any) {
      setThreshError(e.message ?? 'Save failed');
    } finally {
      setThreshSaving(false);
    }
  }

  function patchT(segment: string, patch: Partial<SegmentThresholds>) {
    setThresholds(prev => ({ ...prev, [segment]: { ...prev[segment], ...patch } }));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-surface-400 py-16 justify-center">
        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Loading performance configuration…
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Performance Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Configure KPI weights, thresholds, and scoring rules for this school.</p>
      </div>

      {/* ── Composite Weights ─────────────────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Composite KPI Weights</h2>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${weightSum === 100 ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'}`}>
            Total: {weightSum}%
          </span>
        </div>
        <p className="text-xs text-surface-400">Controls how much each pillar contributes to the overall student KPI score. All four weights must add up to exactly 100%.</p>

        <div className="space-y-4">
          <NumInput label="Academic %" value={weights.academic} onChange={v => setWeights(w => ({ ...w, academic: v }))} />
          <NumInput label="Attendance %" value={weights.attendance} onChange={v => setWeights(w => ({ ...w, attendance: v }))} />
          <NumInput label="Behaviour %" value={weights.behavior} onChange={v => setWeights(w => ({ ...w, behavior: v }))} />
          <NumInput label="Extracurricular (ECO) %" value={weights.eco} onChange={v => setWeights(w => ({ ...w, eco: v }))} />
        </div>

        <SaveBar saving={weightSaving} saved={weightSaved} error={weightError} onSave={saveWeights} />
      </div>

      {/* ── Academic Thresholds ───────────────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Academic Score Thresholds</h2>
        <p className="text-xs text-surface-400">Percentage-based score boundaries for academic KPI rating badges.</p>
        <div className="space-y-4">
          <NumInput label="Excellent — minimum %" value={thresholds.academic.excellentMin} onChange={v => patchT('academic', { excellentMin: v })} />
          <NumInput label="Good — minimum %" value={thresholds.academic.goodMin} onChange={v => patchT('academic', { goodMin: v })} />
          <NumInput label="Average — minimum %" value={thresholds.academic.averageMin} onChange={v => patchT('academic', { averageMin: v })} />
          <NumInput label="Below Average — minimum %" value={thresholds.academic.belowAverageMin} onChange={v => patchT('academic', { belowAverageMin: v })} />
        </div>
      </div>

      {/* ── Attendance Thresholds ─────────────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Attendance Rate Thresholds</h2>
        <p className="text-xs text-surface-400">Attendance percentage boundaries for rating badges. Typically set higher than academic thresholds.</p>
        <div className="space-y-4">
          <NumInput label="Excellent — minimum %" value={thresholds.attendance.excellentMin} onChange={v => patchT('attendance', { excellentMin: v })} />
          <NumInput label="Good — minimum %" value={thresholds.attendance.goodMin} onChange={v => patchT('attendance', { goodMin: v })} />
          <NumInput label="Average — minimum %" value={thresholds.attendance.averageMin} onChange={v => patchT('attendance', { averageMin: v })} />
          <NumInput label="Below Average — minimum %" value={thresholds.attendance.belowAverageMin} onChange={v => patchT('attendance', { belowAverageMin: v })} />
        </div>
      </div>

      {/* ── Behaviour Thresholds ──────────────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Behaviour Incident Thresholds</h2>
        <p className="text-xs text-surface-400">Maximum number of behaviour incidents allowed per rating. Lower = better. Zero incidents = Excellent.</p>
        <div className="space-y-4">
          <NumInput label="Excellent — max incidents" value={thresholds.behavior.behExcellentMax} onChange={v => patchT('behavior', { behExcellentMax: v })} min={0} max={30} step={1} />
          <NumInput label="Good — max incidents" value={thresholds.behavior.behGoodMax} onChange={v => patchT('behavior', { behGoodMax: v })} min={0} max={30} step={1} />
          <NumInput label="Average — max incidents" value={thresholds.behavior.behAverageMax} onChange={v => patchT('behavior', { behAverageMax: v })} min={0} max={30} step={1} />
          <NumInput label="Below Average — max incidents" value={thresholds.behavior.behBelowAvgMax} onChange={v => patchT('behavior', { behBelowAvgMax: v })} min={0} max={30} step={1} />
        </div>
      </div>

      {/* ── ECO / Extracurricular Thresholds ─────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Extracurricular (ECO) Score Thresholds</h2>
        <p className="text-xs text-surface-400">ECO score (0–100) is derived from activity participation points. Set the minimum score for each badge.</p>
        <div className="space-y-4">
          <NumInput label="Excellent — minimum ECO score" value={thresholds.extracurricular.ecoExcellentMin} onChange={v => patchT('extracurricular', { ecoExcellentMin: v })} />
          <NumInput label="Good — minimum ECO score" value={thresholds.extracurricular.ecoGoodMin} onChange={v => patchT('extracurricular', { ecoGoodMin: v })} />
          <NumInput label="Average — minimum ECO score" value={thresholds.extracurricular.ecoAverageMin} onChange={v => patchT('extracurricular', { ecoAverageMin: v })} />
          <NumInput label="Below Average — minimum ECO score" value={thresholds.extracurricular.ecoBelowAvgMin} onChange={v => patchT('extracurricular', { ecoBelowAvgMin: v })} />
        </div>
        <SaveBar saving={threshSaving} saved={threshSaved} error={threshError} onSave={saveThresholds} />
      </div>
    </div>
  );
}
