import type { JobStatus } from "../types/jobs";
export function isActive(status: JobStatus) {
  return status === "pending" || status === "queued" || status === "processing";
}
export function statusClass(status: JobStatus) {
  if (status === "failed") return "text-danger";
  if (status === "completed") return "text-success";
  return "text-warning";
}
