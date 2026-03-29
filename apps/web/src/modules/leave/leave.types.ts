export interface LeaveRow {
  id:               string;
  user_id:          string;
  student_id:       string | null;
  role_code:        string;
  leave_type:       string;
  start_date:       Date;
  end_date:         Date;
  reason:           string;
  status:           string;
  current_step:     number;
  created_at:       Date;
  reviewed_at:      Date | null;
  requester_name:   string;
  student_name:     string | null;
  approved_by_name: string | null;
  workflow_steps:   WorkflowStepRow[];
  actions:          LeaveActionRow[];
}

export interface WorkflowStepRow {
  step_order:     number;
  label:          string;
  approver_role:  string | null;
}

export interface LeaveActionRow {
  step_order: number;
  action:     string;
  comment:    string | null;
  actor_name: string | null;
  created_at: Date;
}

export interface LeaveBalanceRow {
  leave_type:   string;
  total_days:   number;
  used_days:    number;
  remaining:    number;
}
