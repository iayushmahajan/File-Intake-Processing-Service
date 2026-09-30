import { useEffect, useRef, useState } from "react";
import { api, downloadUrl } from "../../lib/api";
import { parseCsvPreview } from "../../lib/csv";
import type { Job, JobPage } from "../../types/jobs";
import { SectionCard } from "../layout/SectionCard";

export function JobsPanel({
  refreshKey,
  selectedId,
  onSelect,
}: {
  refreshKey: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<JobPage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: "10",
        search,
      });
      if (status) params.set("status", status);
      api<JobPage>(`/api/v1/jobs?${params}`, { signal: controller.signal })
        .then((result) => {
          if (!controller.signal.aborted) setData(result);
        })
        .catch((failure) => {
          if (!controller.signal.aborted)
            setError(
              failure instanceof Error
                ? failure.message
                : "Could not load history.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, search, status, refreshKey, reload]);
  return (
    <SectionCard
      title="Processing history"
      description="Search persisted jobs and reopen their analytical workspace."
    >
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-xs text-textMuted">
          Filename or job ID
          <input
            className="field mt-1"
            value={search}
            placeholder="Search jobs…"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="text-xs text-textMuted">
          Status
          <select
            className="field mt-1"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {["pending", "processing", "completed", "failed"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button
          className="button-secondary"
          onClick={() => setReload((value) => value + 1)}
        >
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="notice-error">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="mb-3 text-sm text-textMuted">
          Loading history…
        </p>
      )}
      <div className="overflow-x-auto" aria-busy={loading}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Job / file</th>
              <th>Status</th>
              <th>Records</th>
              <th>Accepted</th>
              <th>Rejected</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.jobs.map((job) => (
              <tr
                key={job.id}
                className={selectedId === job.id ? "bg-accent/5" : ""}
              >
                <td>
                  <button
                    className="text-left text-accentSoft hover:underline"
                    onClick={() => onSelect(job.id)}
                  >
                    #{job.id} · {job.filename_original}
                  </button>
                </td>
                <td>
                  <span
                    className={`status-badge ${job.status === "failed" ? "text-red-300" : "text-emerald-300"}`}
                  >
                    {job.status}
                  </span>
                </td>
                <td>{job.total_rows}</td>
                <td>{job.valid_rows}</td>
                <td>{job.invalid_rows}</td>
                <td>
                  <button
                    className="text-xs text-accentSoft hover:underline"
                    onClick={() => setPreviewJob(job)}
                  >
                    Preview files
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !data?.jobs.length && !error && (
        <p className="empty-state">
          No matching jobs. Upload a sample or adjust your filters.
        </p>
      )}
      <div className="mt-5 flex items-center justify-between gap-3 text-xs text-textMuted">
        <span>
          {data?.total ?? 0} jobs · Page {page} of{" "}
          {Math.max(1, Math.ceil((data?.total ?? 0) / 10))}
        </span>
        <div className="flex gap-2">
          <button
            className="button-secondary"
            disabled={page === 1 || loading}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <button
            className="button-secondary"
            disabled={loading || page * 10 >= (data?.total ?? 0)}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      </div>
      {previewJob && (
        <FilePreview job={previewJob} onClose={() => setPreviewJob(null)} />
      )}
    </SectionCard>
  );
}
function FilePreview({ job, onClose }: { job: Job; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<"input" | "clean" | "errors">("input");
  const [rows, setRows] = useState<string[][]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setRows([]);
    fetch(downloadUrl(job.id, kind), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("This file is unavailable.");
        return response.text();
      })
      .then((text) => {
        if (!controller.signal.aborted) setRows(parseCsvPreview(text));
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error ? failure.message : "Preview failed.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [job.id, kind]);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="preview-title"
      className="w-[95vw] max-w-6xl rounded-2xl border border-borderSoft bg-surface p-6 text-textMain backdrop:bg-black/70"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id="preview-title" className="text-lg font-medium">
            File preview · Job #{job.id}
          </h2>
          <p className="mt-1 text-xs text-textMuted">
            First 25 records. Preview fetches the complete size-limited file.
          </p>
        </div>
        <button className="button-secondary" onClick={onClose}>
          Close
        </button>
      </div>
      <label className="text-sm">
        File
        <select
          className="field my-3"
          value={kind}
          onChange={(event) => setKind(event.target.value as typeof kind)}
        >
          <option value="input">Original upload</option>
          {job.filename_cleaned && (
            <option value="clean">Cleaned output</option>
          )}
          {job.filename_error_report && (
            <option value="errors">Error report</option>
          )}
        </select>
      </label>
      {loading && <p role="status">Loading preview…</p>}
      {error && (
        <p role="alert" className="notice-error">
          {error}
        </p>
      )}
      <div className="max-h-[60vh] overflow-auto">
        <table className="data-table">
          <thead>
            <tr>
              {rows[0]?.map((cell, index) => <th key={index}>{cell}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.slice(1).map((row, index) => (
              <tr key={index}>
                {row.map((cell, column) => (
                  <td key={column} className="whitespace-pre-wrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </dialog>
  );
}
