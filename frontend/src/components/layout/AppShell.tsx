import { useCallback, useRef, useState } from "react";
import { JobsPanel } from "../panels/JobsPanel";
import { ResultsPanel } from "../panels/ResultsPanel";
import { UploadPanel } from "../panels/UploadPanel";

export function AppShell() {
  const [jobId, setJobId] = useState<number | null>(() => {
    const value = Number(
      new URLSearchParams(window.location.search).get("job"),
    );
    return Number.isInteger(value) && value > 0 && value <= 2147483647
      ? value
      : null;
  });
  const selectJob = (id: number) => {
    setJobId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("job", String(id));
    window.history.replaceState(null, "", url);
  };
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const onTerminal = useCallback(() => setRefreshKey((key) => key + 1), []);
  const resultsRef = useRef<HTMLDivElement>(null);
  return (
    <div className="lg:pl-20">
      <nav
        aria-label="Workspace navigation"
        className="fixed inset-y-0 left-0 z-20 hidden w-20 flex-col items-center gap-4 border-r border-borderSoft bg-surface py-6 lg:flex"
      >
        <a
          href="#dashboard"
          aria-label="File Intake dashboard"
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent shadow-sm"
        >
          <img src="/favicon.svg" alt="" className="h-12 w-12" />
        </a>
        <a
          href="#workspace"
          className="rail-link"
          aria-label="Job workspace"
          title="Job workspace"
        >
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M3 9h18M9 9v12" />
          </svg>
        </a>
        <a
          href="#new-job"
          className="rail-link"
          aria-label="Import a dataset"
          title="Import a dataset"
        >
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path d="M12 16V3m-5 5 5-5 5 5M4 14v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6" />
          </svg>
        </a>
        <a
          href="#history"
          className="rail-link"
          aria-label="Processing history"
          title="Processing history"
        >
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2" />
          </svg>
        </a>
      </nav>
      <div
        id="dashboard"
        className="mx-auto max-w-[1520px] px-4 py-6 sm:px-8 sm:py-8"
      >
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-borderSoft pb-6">
          <div>
            <p className="eyebrow">DATA WORKSPACE</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              File Intake{" "}
              <span className="text-textMuted">&amp; Data Quality</span>
            </h1>
            <p className="mt-2 text-sm text-textMuted">
              Import, review and refine your transaction data.
            </p>
          </div>
          <a className="button-primary" href="#new-job">
            + New processing job
          </a>
        </header>
        <main className="space-y-6">
          <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div id="new-job">
              <UploadPanel
                onUploadStart={() => setIsProcessing(true)}
                onUploadError={() => setIsProcessing(false)}
                onUploadComplete={(result) => {
                  selectJob(result.job_id);
                  setIsProcessing(false);
                  setRefreshKey((key) => key + 1);
                }}
              />
            </div>
            <div
              id="workspace"
              ref={resultsRef}
              className="min-w-0 scroll-mt-4"
            >
              <ResultsPanel
                jobId={jobId}
                isLoading={isProcessing}
                onTerminal={onTerminal}
                onSelect={(id) => {
                  selectJob(id);
                  setRefreshKey((key) => key + 1);
                }}
              />
            </div>
          </div>
          <div id="history">
            <JobsPanel
              refreshKey={refreshKey}
              selectedId={jobId}
              onSelect={(id) => {
                selectJob(id);
                resultsRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            />
          </div>
        </main>
        <footer className="py-8 text-xs text-textMuted">
          Deterministic validation · Local file storage · Optional AI
          interpretation
        </footer>
      </div>
    </div>
  );
}
