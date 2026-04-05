export interface CreateChildInput {
  firstName:      string;
  lastName:       string;
  dateOfBirth:    string;   // ISO date "YYYY-MM-DD"
  gender:         string;
  aadhaarNo?:     string;
  classApplying:  string;   // e.g. "Grade 5"
  previousSchool?: string;
}

export interface CreateApplicationInput {
  schoolId:         string;
  parentName:       string;
  parentPhone:      string;
  parentEmail:      string;
  parentOccupation?: string;
  parentUserId?:    string | null;
  children:         CreateChildInput[];
}

export interface ValidationFlag {
  code:       string;
  severity:   'warning' | 'error';
  message:    string;
  childIndex: number;
}

export interface ValidationResult {
  flags:     ValidationFlag[];
  riskScore: number;
}

export interface ApplicationActionInput {
  applicationId: string;
  actorUserId:   string;
  actorName:     string;
  action:        'approve' | 'reject';
  comment?:      string;
}

export interface ApplicationListParams {
  schoolId:  string;
  status?:   string;
  search?:   string;
  page:      number;
  limit:     number;
  skip:      number;
}

export interface WorkflowStepInput {
  stepOrder:    number;
  label:        string;
  approverRole: string;
}

export interface CreateWorkflowInput {
  schoolId: string;
  name:     string;
  steps:    WorkflowStepInput[];
}
