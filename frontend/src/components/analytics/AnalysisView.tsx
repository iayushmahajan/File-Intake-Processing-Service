import { useState } from "react";
import type { JobDetail } from "../../types/jobs";

function label(value: string) {
  return value.replace(/_/g, " ");
}
function Bars({ values }: { values: { value: string; count: number }[] }) {
  const max = Math.max(1, ...values.map((item) => item.count));
  return (
    <div className="space-y-3">
      {values.map((item) => (
        <div key={item.value}>
          <div className="mb-1 flex justify-between gap-3 text-xs">
            <span className="break-words">{item.value}</span>
            <span className="font-mono text-textMuted">{item.count}</span>
          </div>
          <div className="h-2 rounded bg-surfaceSoft">
            <div
              className="h-2 rounded bg-accentSoft"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
export function AnalysisView({ job }: { job: JobDetail }) {
  const [tab, setTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const analysis = job.analysis;
  const percentage = job.total_rows
    ? (job.valid_rows / job.total_rows) * 100
    : 0;
  const errors =
    analysis?.error_preview?.filter((row) =>
      Object.values(row).join(" ").toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  const tabs = ["Overview", "Validation", "Data profile", "Anomalies"];
  return (
    <>
      <nav
        aria-label="Analysis sections"
        className="my-5 flex flex-wrap gap-2 border-b border-borderSoft pb-3"
      >
        {tabs.map((name) => (
          <button
            key={name}
            aria-pressed={tab === name}
            onClick={() => setTab(name)}
            className={`rounded-lg px-3 py-2 text-sm ${tab === name ? "bg-accent/15 text-accentSoft" : "text-textMuted hover:bg-surfaceSoft"}`}
          >
            {name}
          </button>
        ))}
      </nav>
      {!analysis ? (
        <p className="empty-state">
          This historical job predates persisted analytics. Its files and row
          counts are still available.
        </p>
      ) : (
        <>
          {tab === "Overview" && (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="subcard">
                  <h3 className="mb-4 font-medium">Record acceptance</h3>
                  <div className="flex items-center gap-5">
                    <svg
                      role="img"
                      aria-label={`${percentage.toFixed(1)} percent valid records`}
                      viewBox="0 0 120 120"
                      className="h-28 w-28 shrink-0"
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke={job.invalid_rows > 0 ? "#f87171" : "#243041"}
                        strokeWidth="12"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="12"
                        pathLength="100"
                        strokeDasharray={`${percentage} ${100 - percentage}`}
                        transform="rotate(-90 60 60)"
                      />
                      <text
                        x="60"
                        y="65"
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize="18"
                      >
                        {percentage.toFixed(0)}%
                      </text>
                    </svg>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-emerald-400">●</span>{" "}
                        {job.valid_rows} accepted
                      </p>
                      <p>
                        <span className="text-red-400">●</span>{" "}
                        {job.invalid_rows} rejected
                      </p>
                      <p className="text-xs text-textMuted">
                        {job.total_rows ? (100 - percentage).toFixed(1) : "0"}%
                        invalid
                      </p>
                    </div>
                  </div>
                </div>
                <div className="subcard">
                  <h3 className="mb-3 font-medium">Quality dimensions</h3>
                  {Object.entries(analysis.quality?.dimensions ?? {}).map(
                    ([key, value]) => (
                      <div
                        className="flex justify-between py-1.5 text-sm"
                        key={key}
                      >
                        <span className="capitalize text-textMuted">
                          {label(key)}
                        </span>
                        <span>
                          {value === null
                            ? "Not measurable"
                            : `${value.toFixed(1)} / 100`}
                        </span>
                      </div>
                    ),
                  )}
                  <p className="mt-3 text-xs text-textMuted">
                    Weighted score: validity 60%, completeness 20%, uniqueness
                    10%, anomaly health 10%. Unmeasurable dimensions are
                    excluded and weights rescaled.
                  </p>
                </div>
              </div>
              <div className="subcard">
                <h3 className="mb-3 font-medium">Observed signals</h3>
                <ul className="space-y-2 text-sm text-textMuted">
                  {analysis.insights?.map((text) => <li key={text}>{text}</li>)}
                </ul>
              </div>
            </div>
          )}
          {tab === "Validation" && (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="subcard">
                  <h3 className="mb-4 font-medium">
                    Validation issue distribution
                  </h3>
                  <Bars
                    values={Object.entries(job.error_breakdown).map(
                      ([value, count]) => ({ value, count }),
                    )}
                  />
                  {!Object.keys(job.error_breakdown).length && (
                    <p className="text-sm text-textMuted">
                      No validation issues detected.
                    </p>
                  )}
                  <p className="mt-4 text-xs text-textMuted">
                    A record can contain multiple issues.
                  </p>
                </div>
                <div className="subcard">
                  <h3 className="mb-4 font-medium">
                    Recurring error combinations
                  </h3>
                  {analysis.error_patterns?.slice(0, 5).map((item) => (
                    <p
                      className="mb-3 text-xs text-textMuted"
                      key={item.pattern}
                    >
                      <strong className="text-textMain">{item.count}× </strong>
                      {item.pattern}
                    </p>
                  ))}
                </div>
              </div>
              <label className="block text-sm">
                Search rejected records
                <input
                  className="field mt-2"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Row, value or error message"
                />
              </label>
              <p className="text-xs text-textMuted">
                Search covers the first 100 rejected records. Download the error
                CSV for all records. Correct the listed fields and upload again.
              </p>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>CSV record</th>
                      <th>Customer</th>
                      <th>Issues to correct</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((row) => (
                      <tr key={row.row_number}>
                        <td>{row.row_number}</td>
                        <td>{row.customer_id || "Missing"}</td>
                        <td className="min-w-64 whitespace-normal">
                          {row.errors}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!errors.length && (
                  <p className="empty-state">No matching rejected records.</p>
                )}
              </div>
            </div>
          )}
          {tab === "Data profile" && (
            <div className="space-y-5">
              <p className="text-xs text-textMuted">
                Profiles describe accepted records only. Order amounts retain
                their original currency and are not converted.
              </p>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Numeric field</th>
                      <th>Count</th>
                      <th>Min</th>
                      <th>Average</th>
                      <th>Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analysis.profiling?.numeric ?? {}).map(
                      ([key, value]) => (
                        <tr key={key}>
                          <td className="capitalize">{label(key)}</td>
                          <td>{value.count}</td>
                          <td>{value.min ?? "—"}</td>
                          <td>{value.average?.toFixed(2) ?? "—"}</td>
                          <td>{value.max ?? "—"}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(analysis.profiling?.categorical ?? {}).map(
                  ([key, values]) => (
                    <div key={key} className="subcard">
                      <h3 className="mb-4 text-sm font-medium capitalize">
                        {label(key)} · Top 3
                      </h3>
                      <Bars values={values} />
                      {!values.length && (
                        <p className="text-xs text-textMuted">
                          No accepted values.
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>
              <p className="text-sm text-textMuted">
                {analysis.duplicate_records ?? 0} duplicate records ·{" "}
                {analysis.missing_cells ?? 0} missing required cells
              </p>
            </div>
          )}
          {tab === "Anomalies" && (
            <>
              <p className="mb-4 text-sm text-textMuted">
                Review signals in accepted records: amount &gt; 1,000 in its
                source currency, quantity &gt; 20, or discount &gt; 50%. These
                are heuristics, not additional rejection rules. Showing up to
                100 signals.
              </p>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>CSV record</th>
                      <th>Field</th>
                      <th>Value</th>
                      <th>Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.anomalies?.map((item, index) => (
                      <tr key={`${item.row}-${index}`}>
                        <td>{item.row}</td>
                        <td>{label(item.column)}</td>
                        <td>{item.value}</td>
                        <td>{item.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!analysis.anomalies?.length && (
                  <p className="empty-state">
                    No heuristic anomalies detected in accepted records.
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
