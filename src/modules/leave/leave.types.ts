export interface LeaveRow {
  id:               string;
  role_code:        string;
  start_date:       Date;
  end_date:         Date;
  reason:           string;
  status:           string;
  created_at:       Date;
  reviewed_at:      Date | null;
  requester_name:   string;
  approved_by_name: string | null;
}
