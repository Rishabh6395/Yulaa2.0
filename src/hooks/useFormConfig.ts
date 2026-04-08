'use client';

import useSWR from 'swr';
import { FORM_DEFINITIONS, FORM_FIELDS_MAP, getDefaultLabel, type FieldDef } from '@/lib/formDefinitions';

// Fetcher with auth — same as useApi
async function fetcher(url: string) {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { const err: any = new Error('API error'); err.status = res.status; throw err; }
  return res.json();
}

// No dedup — always refetch when refresh() is called
const FC_DEDUP = 0;

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

// ─── Field → master API mapping ────────────────────────────────────────────────
// Maps field IDs to the API endpoint that provides their dropdown options

const FIELD_MASTER_API: Record<string, string> = {
  gender:       '/api/masters/gender',
  childGender:  '/api/masters/gender',
  bloodGroup:   '/api/masters/blood-groups',
  qualification:'/api/masters/qualifications',
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

/**
 * Fetches form config (labels, visibility, required, editable) from the
 * Super Admin template and masters (gender options, blood groups, etc.).
 *
 * Everything comes from the server — no hardcoded values in form pages.
 *
 * Usage:
 *   const fc = useFormConfig('add_student_form');
 *   fc.label('gender')         → 'Gender' (or custom label from config)
 *   fc.visible('gender')       → true/false
 *   fc.required('gender')      → true/false
 *   fc.options('gender')        → ['Male', 'Female', 'Other'] from GenderMaster
 *   fc.contentOptions('slot1') → options[] from ContentTypeMaster
 */
export function useFormConfig(formId: string) {
  const user: any =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

  const schoolId   = user.schoolId ?? user.school_id ?? '';
  const systemRole = user.primaryRole ?? '';
  const configRole = SYSTEM_TO_CONFIG_ROLE[systemRole] ?? systemRole;

  // ── Form config — always reads live from Super Admin, short cache ──────────
  const cfgKey   = schoolId ? `/api/form-config?schoolId=${schoolId}&formId=${formId}` : null;
  const gKey     = schoolId ? `/api/masters/gender?schoolId=${schoolId}` : null;
  const bgKey    = schoolId ? `/api/masters/blood-groups?schoolId=${schoolId}` : null;
  const qualKey  = schoolId ? `/api/masters/qualifications?schoolId=${schoolId}` : null;
  const ctKey    = schoolId ? `/api/masters/content-types?schoolId=${schoolId}&formName=${formId}` : null;

  const swrOpts  = { dedupingInterval: FC_DEDUP, revalidateOnFocus: true, revalidateOnMount: true, keepPreviousData: true };

  const { data: cfgData,           isLoading: cfgLoading, mutate: mutateCfg  } = useSWR<{ configs: Record<string, Record<string, Record<string, any>>> }>(cfgKey, fetcher, swrOpts);
  const { data: genderData,        mutate: mutateGender      } = useSWR<{ genderMasters: { name: string }[] }>(gKey,  fetcher, swrOpts);
  const { data: bloodGroupData,    mutate: mutateBloodGroup  } = useSWR<{ bloodGroupMasters: { name: string }[] }>(bgKey,  fetcher, swrOpts);
  const { data: qualificationData, mutate: mutateQual        } = useSWR<{ qualificationMasters: { name: string }[] }>(qualKey, fetcher, swrOpts);
  const { data: contentTypeData,   mutate: mutateCt          } = useSWR<{ contentTypes: { fieldSlot: string; options: string[]; fieldType: string; label: string }[] }>(ctKey, fetcher, swrOpts);

  // ── Normalise field rules ───────────────────────────────────────────────────
  const rawRules: Record<string, any> = cfgData?.configs?.[formId]?.[configRole] ?? {};
  const rules: Record<string, FieldRule> = Object.fromEntries(
    Object.entries(rawRules).map(([k, v]) => [k, normalise(v)]),
  );

  // ── Static field definitions ────────────────────────────────────────────────
  const fields: FieldDef[] = FORM_FIELDS_MAP[formId] ?? [];

  // ── Master options map ──────────────────────────────────────────────────────
  const masterOptions: Record<string, string[]> = {
    gender:        (genderData?.genderMasters        ?? []).map(m => m.name),
    childGender:   (genderData?.genderMasters        ?? []).map(m => m.name),
    bloodGroup:    (bloodGroupData?.bloodGroupMasters ?? []).map(m => m.name),
    qualification: (qualificationData?.qualificationMasters ?? []).map(m => m.name),
  };

  // Content type options indexed by fieldSlot
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

    /** Label: custom config label → definition default → fieldId */
    label(fieldId: string): string {
      const saved = rules[fieldId]?.label;
      if (saved) return saved;
      return getDefaultLabel(formId, fieldId);
    },

    /** Whether the field should be shown. Defaults true. */
    visible(fieldId: string): boolean {
      return rule(fieldId).visible;
    },

    /** Whether the field is editable. Defaults true. */
    editable(fieldId: string): boolean {
      return rule(fieldId).editable;
    },

    /** Whether the field is required. Defaults false. */
    required(fieldId: string): boolean {
      return rule(fieldId).required;
    },

    /**
     * Dropdown options for a standard master field (gender, bloodGroup, qualification).
     * Returns string[] from the master API, empty array if not loaded yet.
     * Falls back to provided static defaults if master is empty.
     */
    options(fieldId: string, staticFallback?: string[]): string[] {
      return masterOptions[fieldId]?.length
        ? masterOptions[fieldId]
        : (staticFallback ?? []);
    },

    /**
     * Dropdown options from ContentTypeMaster for a given field slot.
     * Used for dynamic/extra fields added by Super Admin via Content Types.
     */
    contentOptions(fieldSlot: string): string[] {
      return contentSlotOptions[fieldSlot] ?? [];
    },

    /**
     * Dynamic extra fields added via ContentTypeMaster for this form.
     * Use to render additional fields beyond the core set.
     */
    extraFields(): { id: string; label: string; type: string; slot: string }[] {
      return (contentTypeData?.contentTypes ?? []).map(ct => ({
        id:    ct.fieldSlot,
        label: ct.label,
        type:  ct.fieldType,
        slot:  ct.fieldSlot,
      }));
    },

    rule,

    /**
     * Force a fresh fetch of all form-config and master data right now.
     * Call this when opening a modal to guarantee the latest Super Admin
     * config is loaded, bypassing the SWR dedup interval.
     */
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
