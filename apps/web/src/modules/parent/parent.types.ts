export interface ChildRow {
  id:               string;
  first_name:       string;
  last_name:        string;
  admission_no:     string;
  photo_url:        string | null;
  school_id:        string;
  school_name:      string;
  class_id:         string | null;
  grade:            string | null;
  section:          string | null;
  relationship:     string | null;
  is_primary_child: boolean;
}
