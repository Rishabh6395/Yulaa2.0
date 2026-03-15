export interface QueryRow {
  id:               string;
  subject:          string;
  message:          string;
  status:           string;
  response:         string | null;
  responded_at:     Date | null;
  created_at:       Date;
  student_name:     string | null;
  raised_by_name:   string | null;
  assigned_to_name: string | null;
}
