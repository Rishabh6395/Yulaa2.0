export interface AnnouncementRow {
  id:               string;
  title:            string;
  message:          string;
  target_roles:     string[];
  priority:         string;
  status:           string;
  expires_at:       Date | null;
  published_at:     Date;
  created_by_name:  string | null;
}
