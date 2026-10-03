export type JobStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "failed";
export type NumericProfile = {
  count: number;
  min: number | null;
  max: number | null;
  average: number | null;
};
export type AiReport = {
  quality_score: number;
  severity: "low" | "medium" | "high";
  executive_summary: string;
  key_issues: string[];
  recommended_actions: string[];
  business_impact: string;
};
export type Analysis = {
  profiling?: {
    numeric: Record<string, NumericProfile>;
    categorical: Record<string, { value: string; count: number }[]>;
  };
  quality?: { score: number | null; dimensions: Record<string, number | null> };
  anomalies?: { row: number; column: string; value: number; message: string }[];
  anomaly_count?: number;
  validation_issue_count?: number;
  duplicate_records?: number;
  missing_cells?: number;
  error_patterns?: { pattern: string; count: number }[];
  error_preview?: Record<string, string | null>[];
  insights?: string[];
};
export type Job = {
  id: number;
  filename_original: string;
  filename_input_saved: string;
  filename_cleaned: string;
  filename_error_report: string;
  status: JobStatus;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};
export type JobDetail = Job & {
  attempts: number;
  file_size: number | null;
  duration_ms: number | null;
  analysis: Analysis | null;
  error_breakdown: Record<string, number>;
  ai_report: AiReport | null;
};
export type JobPage = {
  jobs: Job[];
  total: number;
  page: number;
  page_size: number;
};
export type UploadResult = {
  status_url: string;
  job_id: number;
  status: JobStatus;
  message: string;
  error_message: string | null;
  original_filename: string;
  saved_filename: string;
};
