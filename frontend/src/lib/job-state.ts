import type { JobStatus } from "../types/jobs";
export function isActive(status: JobStatus) {
  return status === "pending" || status === "queued" || status === "processing";
}
export function statusClass(status: JobStatus) {
  if (status === "failed") return "text-red-300";
  if (status === "completed") return "text-emerald-300";
  return "text-amber-200";
}
