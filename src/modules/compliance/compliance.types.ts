export const COMPLIANCE_CATEGORIES = [
  { key: 'regulatory',       label: 'Regulatory / Education Board' },
  { key: 'document',         label: 'Document Compliance' },
  { key: 'staff',            label: 'Staff & HR Compliance' },
  { key: 'financial',        label: 'Financial Compliance' },
  { key: 'academic',         label: 'Academic Compliance' },
  { key: 'data_protection',  label: 'Data Protection & Privacy' },
  { key: 'communication',    label: 'Communication Compliance' },
  { key: 'child_safety',     label: 'Child Safety & Mandatory Policies' },
  { key: 'infrastructure',   label: 'Infrastructure & Operational' },
  { key: 'audit',            label: 'Audit & Reporting' },
  { key: 'custom',           label: 'Custom' },
] as const;

export type ComplianceCategoryKey = typeof COMPLIANCE_CATEGORIES[number]['key'];

export const COMPLIANCE_STATUSES = ['compliant', 'non_compliant', 'pending', 'not_applicable'] as const;
export type ComplianceStatus = typeof COMPLIANCE_STATUSES[number];

export interface ComplianceItemInput {
  category:    ComplianceCategoryKey;
  title:       string;
  description?: string;
  status?:     ComplianceStatus;
  dueDate?:    string;
  notes?:      string;
  assignedTo?: string;
}

export interface ComplianceItemUpdate {
  status?:      ComplianceStatus;
  notes?:       string;
  dueDate?:     string;
  title?:       string;
  description?: string;
  assignedTo?:  string;
}
