'use client';

import { useApi } from './useApi';
import { FORM_DEFINITIONS, FORM_FIELDS_MAP, getDefaultLabel, type FieldDef } from '@/lib/formDefinitions';

export type { FieldDef };

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface FieldRule {
  visible:  boolean;
  editable: boolean;
  required: boolean;
  label:    string; // custom label override; '' = use definition default
}

export const FIELD_DEFAULT: FieldRule = { visible: true, editable: true, required: false, label: '' };

// ─── Maps system role → form-config role ────────────────────────────────────────

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

/**
 * Fetches form config for the current user's school + role and provides helpers
 * for field visibility, editability, required state, and labels.
 *
 * Labels are resolved in this priority order:
 *   1. Custom label set by Super Admin / School Admin in form-config page
 *   2. Default label from FORM_DEFINITIONS (shared source of truth)
 *
 * This means the label shown in every form ALWAYS matches what's visible
 * in the form-config admin page — no divergence.
 *
 * Usage:
 *   const fc = useFormConfig('query_form');
 *   fc.label('message')        → 'Message' (or custom if set)
 *   fc.visible('message')      → true/false
 *   fc.editable('message')     → true/false
 *   fc.required('message')     → true/false
 *   fc.fields                  → ordered FieldDef[] for this form (from definitions)
 */
export function useFormConfig(formId: string) {
  const user: any =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

  const schoolId   = user.schoolId ?? user.school_id ?? '';
  const systemRole = user.primaryRole ?? '';
  const configRole = SYSTEM_TO_CONFIG_ROLE[systemRole] ?? systemRole;

  const { data, isLoading } = useApi<{
    configs: Record<string, Record<string, Record<string, any>>>;
  }>(schoolId ? `/api/form-config?schoolId=${schoolId}&formId=${formId}` : null);

  // Normalised rules for the current role
  const rawRules: Record<string, any> = data?.configs?.[formId]?.[configRole] ?? {};
  const rules: Record<string, FieldRule> = Object.fromEntries(
    Object.entries(rawRules).map(([k, v]) => [k, normalise(v)]),
  );

  // Static field definitions for this form (ordered, from shared source of truth)
  const fields: FieldDef[] = FORM_FIELDS_MAP[formId] ?? [];

  function rule(fieldId: string): FieldRule {
    return rules[fieldId] ?? { ...FIELD_DEFAULT };
  }

  return {
    isLoading,
    rules,

    /**
     * Ordered field definitions for this form.
     * Each field reflects the saved config (or defaults if not yet configured).
     * Use this to drive form rendering so fields always match what's in form-config.
     */
    fields,

    /**
     * Returns the label for a field.
     * Priority: custom label from config → definition default → fieldId.
     * Never returns a hardcoded string from the form page itself.
     */
    label(fieldId: string): string {
      const saved = rules[fieldId]?.label;
      if (saved) return saved;
      return getDefaultLabel(formId, fieldId);
    },

    /** Whether the field should be shown. Defaults true if no config saved. */
    visible(fieldId: string): boolean {
      return rule(fieldId).visible;
    },

    /** Whether the field is user-editable (not view-only). Defaults true. */
    editable(fieldId: string): boolean {
      return rule(fieldId).editable;
    },

    /** Whether the field is required. Defaults false. */
    required(fieldId: string): boolean {
      return rule(fieldId).required;
    },

    /** Full rule for a field. */
    rule,
  };
}

// Re-export definitions so form pages can import from one place
export { FORM_DEFINITIONS };
