'use client';

import useSWR from 'swr';
import { FORM_DEFINITIONS, FORM_FIELDS_MAP, getDefaultLabel, type FieldDef } from '@/lib/formDefinitions';

// Fetcher with auth
async function fetcher(url: string) {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { const err: any = new Error('API error'); err.status = res.status; throw err; }
  return res.json();
}

// 5-min client-side dedup: prevents re-fetching on every navigation/render.
// refresh() bypasses this via bound mutate() — still hits Redis (~0ms), not DB.
const FC_DEDUP = 5 * 60_000;

export type { FieldDef };

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface FieldRule {
  visible:  boolean;
  editable: boolean;
  required: boolean;
  label:    string;
}

export const FIELD_DEFAULT: FieldRule = { visible: true, editable: true, required: false, label: '' };

// ─── System role → form-config role ────────────────────────────────────────────

const SYSTEM_TO_CONFIG_ROLE: Record<string, string> = {
  super_admin:    'admin',
  school_admin:   'admin',
  principal:      'admin',
  hod:            'admin',
  vice_principal: 'admin',
  teacher:        'teacher',
  student:        'student',
  parent:         'parent',
  applicant:      'applicant',
};

// ─── Normalise stored value → FieldRule ─────────────────────────────────────────

function normalise(val: any): FieldRule {
  if (!val) return { ...FIELD_DEFAULT };
  if (typeof val === 'string') {
    return {
      visible:  val !== 'hidden',
      editable: true,
      required: val === 'required',
      label:    '',
    };
  }
  return { ...FIELD_DEFAULT, ...(val as Partial<FieldRule>) };
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useFormConfig(formId: string) {
  const user: any =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

  const schoolId   = user.schoolId ?? user.school_id ?? '';
  const systemRole = user.primaryRole ?? '';
  const configRole = SYSTEM_TO_CONFIG_ROLE[systemRole] ?? systemRole;

  const cfgKey   = schoolId ? `/api/form-config?schoolId=${schoolId}&formId=${formId}` : null;
  const gKey     = schoolId ? `/api/masters/gender?schoolId=${schoolId}` : null;
  const bgKey    = schoolId ? `/api/masters/blood-groups?schoolId=${schoolId}` : null;
  const qualKey  = schoolId ? `/api/masters/qualifications?schoolId=${schoolId}` : null;
  const ctKey    = schoolId ? `/api/masters/content-types?schoolId=${schoolId}&formName=${formId}` : null;

  const swrOpts  = { dedupingInterval: FC_DEDUP, revalidateOnFocus: true, revalidateOnMount: true, keepPreviousData: true };

  const { data: cfgData,           isLoading: cfgLoading, mutate: mutateCfg       } = useSWR<{ configs: Record<string, Record<string, Record<string, any>>> }>(cfgKey, fetcher, swrOpts);
  const { data: genderData,        mutate: mutateGender      } = useSWR<{ genderMasters: { name: string }[] }>(gKey,  fetcher, swrOpts);
  const { data: bloodGroupData,    mutate: mutateBloodGroup  } = useSWR<{ bloodGroupMasters: { name: string }[] }>(bgKey,  fetcher, swrOpts);
  const { data: qualificationData, mutate: mutateQual        } = useSWR<{ qualificationMasters: { name: string }[] }>(qualKey, fetcher, swrOpts);
  const { data: contentTypeData,   mutate: mutateCt          } = useSWR<{ contentTypes: { fieldSlot: string; options: string[]; fieldType: string; label: string }[] }>(ctKey, fetcher, swrOpts);

  const rawRules: Record<string, any> = cfgData?.configs?.[formId]?.[configRole] ?? {};
  const rules: Record<string, FieldRule> = Object.fromEntries(
    Object.entries(rawRules).map(([k, v]) => [k, normalise(v)]),
  );

  const fields: FieldDef[] = FORM_FIELDS_MAP[formId] ?? [];

  const masterOptions: Record<string, string[]> = {
    gender:        (genderData?.genderMasters        ?? []).map(m => m.name),
    childGender:   (genderData?.genderMasters        ?? []).map(m => m.name),
    bloodGroup:    (bloodGroupData?.bloodGroupMasters ?? []).map(m => m.name),
    qualification: (qualificationData?.qualificationMasters ?? []).map(m => m.name),
  };

  const contentSlotOptions: Record<string, string[]> = {};
  for (const ct of contentTypeData?.contentTypes ?? []) {
    if (ct.fieldType === 'dropdown' && ct.options?.length) {
      contentSlotOptions[ct.fieldSlot] = ct.options;
    }
  }

  function rule(fieldId: string): FieldRule {
    return rules[fieldId] ?? { ...FIELD_DEFAULT };
  }

  return {
    isLoading: cfgLoading,
    rules,
    fields,

    label(fieldId: string): string {
      const saved = rules[fieldId]?.label;
      if (saved) return saved;
      return getDefaultLabel(formId, fieldId);
    },

    visible(fieldId: string): boolean {
      return rule(fieldId).visible;
    },

    editable(fieldId: string): boolean {
      return rule(fieldId).editable;
    },

    required(fieldId: string): boolean {
      return rule(fieldId).required;
    },

    options(fieldId: string, staticFallback?: string[]): string[] {
      return masterOptions[fieldId]?.length
        ? masterOptions[fieldId]
        : (staticFallback ?? []);
    },

    contentOptions(fieldSlot: string): string[] {
      return contentSlotOptions[fieldSlot] ?? [];
    },

    extraFields(): { id: string; label: string; type: string; slot: string }[] {
      return (contentTypeData?.contentTypes ?? []).map(ct => ({
        id:    ct.fieldSlot,
        label: ct.label,
        type:  ct.fieldType === 'dropdown' ? 'dropdown' : 'text',
        slot:  ct.fieldSlot,
      }));
    },

    rule,

    refresh() {
      mutateCfg();
      mutateGender();
      mutateBloodGroup();
      mutateQual();
      mutateCt();
    },
  };
}

export { FORM_DEFINITIONS };
