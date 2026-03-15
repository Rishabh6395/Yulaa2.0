export interface HomeworkRow {
  id:             string;
  subject:        string;
  title:          string;
  description:    string | null;
  due_date:       Date;
  created_at:     Date;
  grade:          string;
  section:        string;
  teacher_name:   string;
  submissions:    number;
  total_students: number;
}
