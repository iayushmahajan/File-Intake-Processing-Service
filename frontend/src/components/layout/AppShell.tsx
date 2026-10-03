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
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-borderSoft pb-6">
        <div>
          <p className="eyebrow">DATA OPERATIONS / WORKSPACE</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            File Intake{" "}
            <span className="text-textMuted">&amp; Data Quality</span>
          </h1>
          <p className="mt-2 text-sm text-textMuted">
            Validate records. Understand exceptions. Deliver dependable data.
          </p>
        </div>
        <a className="button-secondary" href="#new-job">
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
          <div ref={resultsRef} className="min-w-0 scroll-mt-4">
            <ResultsPanel
              jobId={jobId}
              isLoading={isProcessing}
              onTerminal={onTerminal}
            />
          </div>
        </div>
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
      </main>
      <footer className="py-8 text-xs text-textMuted">
        Deterministic validation · Local file storage · Optional AI
        interpretation
      </footer>
    </div>
  );
}
