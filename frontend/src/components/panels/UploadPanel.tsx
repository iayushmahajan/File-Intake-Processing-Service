import { useEffect, useRef, useState } from "react";
import { SectionCard } from "../layout/SectionCard";
import { api } from "../../lib/api";
import type { UploadResult } from "../../types/jobs";
import {
  FIELDS,
  fieldLabel,
  type FieldRule,
  type ImportOptions,
  type ImportPreview,
  type ImportTemplate,
} from "../../types/imports";
export type { UploadResult } from "../../types/jobs";
type UploadPanelProps = {
  onUploadStart?: () => void;
  onUploadComplete: (result: UploadResult) => void;
  onUploadError?: () => void;
};
const SAMPLE_CSV = `customer_id,email,country,signup_date,order_amount,currency,payment_method,order_status,product_category,quantity,discount_percent,last_login_date
CUST-001,alice@example.com,DE,2026-04-01,125.50,EUR,card,completed,electronics,2,10,2026-04-10
CUST-002,bob@example.com,IN,2026-04-03,89.99,INR,paypal,pending,clothing,1,5,2026-04-09
CUST-003,charlie@example.com,US,2026-04-05,250.00,USD,card,completed,home,3,0,2026-04-12
CUST-004,diana.example.com,FR,2026-04-07,49.90,EUR,bank_transfer,completed,books,1,15,2026-04-13
CUST-005,ethan@example.com,GB,2026-04-08,180.75,BTC,paypal,pending,electronics,2,20,2026-04-14
CUST-006,fatima@example.com,DE,2026-04-09,15.00,USD,card,cancelled,beauty,1,0,2026-04-15
`;

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "sample_customer_transactions.csv";
  link.click();

  URL.revokeObjectURL(url);
}

export function UploadPanel({
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<ImportPreview | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [options, setOptions] = useState<ImportOptions>({
    mapping: {},
    rules: {},
  });
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ImportTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [ruleField, setRuleField] = useState<string>("order_amount");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [templateError, setTemplateError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api<ImportTemplate[]>("/api/v1/imports/templates", {
      signal: controller.signal,
    })
      .then(setTemplates)
      .catch(() => {
        if (!controller.signal.aborted)
          setTemplateError(
            "Templates unavailable. You can still configure this import.",
          );
      });
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, []);
  const changeOptions = (next: ImportOptions) => {
    setOptions({ ...next, template_id: null, template_version: null });
    setPreview(null);
    setError("");
    setMessage("");
  };
  const rule = options.rules[ruleField] ?? {};
  const changeRule = (patch: Partial<FieldRule>) =>
    changeOptions({
      ...options,
      rules: { ...options.rules, [ruleField]: { ...rule, ...patch } },
    });
  const inspect = async (next: File) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setFile(next);
    setInspection(null);
    setPreview(null);
    setError("");
    setMessage("");
    setSelectedTemplate(null);
    setTemplateName("");
    setOptions({ mapping: {}, rules: {} });
    if (!next.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are allowed.");
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", next);
      const data = await api<ImportPreview>("/api/v1/imports/preview", {
        method: "POST",
        body,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setInspection(data);
        setOptions({ mapping: data.suggested_mapping, rules: {} });
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError((failure as Error).message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  const complete =
    FIELDS.every(
      (field) =>
        options.mapping[field] &&
        inspection?.headers.includes(options.mapping[field]),
    ) && new Set(Object.values(options.mapping)).size === FIELDS.length;
  const runPreview = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("import_options", JSON.stringify(options));
      setPreview(
        await api<ImportPreview>("/api/v1/imports/preview", {
          method: "POST",
          body,
        }),
      );
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const saveTemplate = async (update: boolean) => {
    setBusy(true);
    setError("");
    try {
      const saved = await api<ImportTemplate>(
        `/api/v1/imports/templates${update ? `/${selectedTemplate!.id}` : ""}`,
        {
          method: update ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName,
            options,
            expected_version: update ? selectedTemplate!.version : null,
          }),
        },
      );
      setTemplates((items) => [
        ...items.filter((item) => item.id !== saved.id),
        saved,
      ]);
      setSelectedTemplate(saved);
      setOptions({
        ...saved.options,
        template_id: saved.id,
        template_version: saved.version,
      });
      setPreview(null);
      setMessage(
        `Saved ${saved.name}, version ${saved.version}. Preview before processing.`,
      );
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async () => {
    if (!file || !preview) return;
    setBusy(true);
    setError("");
    onUploadStart?.();
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("import_options", JSON.stringify(options));
      const result = await api<UploadResult>("/api/v1/uploads", {
        method: "POST",
        body,
      });
      onUploadComplete(result);
      setMessage(
        `Job #${result.job_id} accepted. Processing continues in the background.`,
      );
    } catch (failure) {
      setError((failure as Error).message);
      onUploadError?.();
    } finally {
      setBusy(false);
    }
  };
  return (
    <SectionCard
      title="Import a dataset"
      description="Map your columns, preview validation and start a tracked processing job."
    >
      <div className="space-y-4">
        <ol
          aria-label="Import steps"
          className="flex flex-wrap gap-2 text-xs text-textMuted"
        >
          {["1. Choose CSV", "2. Map columns", "3. Preview", "4. Process"].map(
            (step, i) => (
              <li
                key={step}
                className={
                  i === (!inspection ? 0 : !preview ? 1 : 2)
                    ? "text-accentSoft font-semibold"
                    : ""
                }
              >
                {step}
              </li>
            ),
          )}
        </ol>
        <div
          className="rounded-xl border border-dashed border-borderSoft bg-surfaceSoft p-5 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy && e.dataTransfer.files[0])
              void inspect(e.dataTransfer.files[0]);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            aria-label="CSV file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.[0]) void inspect(e.target.files[0]);
            }}
          />
          <p className="text-sm">Drop a transaction CSV here</p>
          <button
            className="button-secondary mt-3"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Choose File
          </button>
          {file && (
            <p className="mt-3 break-all text-xs text-textMuted">
              {file.name} · {formatFileSize(file.size)}
            </p>
          )}
        </div>
        <button
          className="text-xs text-accentSoft underline"
          onClick={downloadSampleCsv}
        >
          Download Sample CSV
        </button>
        {error && (
          <p className="notice-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-success" role="status">
            {message}
          </p>
        )}
        {busy && (
          <p role="status" className="text-sm text-textMuted">
            Working…
          </p>
        )}
        {inspection && (
          <>
            <label className="block text-xs">
              Saved import template
              <select
                className="field mt-1"
                disabled={busy}
                value={selectedTemplate?.id ?? ""}
                onChange={(e) => {
                  const template =
                    templates.find(
                      (item) => item.id === Number(e.target.value),
                    ) ?? null;
                  setSelectedTemplate(template);
                  setTemplateName(template?.name ?? "");
                  setPreview(null);
                  setError("");
                  setMessage("");
                  setOptions(
                    template
                      ? {
                          ...template.options,
                          template_id: template.id,
                          template_version: template.version,
                        }
                      : { mapping: inspection.suggested_mapping, rules: {} },
                  );
                }}
              >
                <option value="">Suggested mapping</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · v{item.version}
                  </option>
                ))}
              </select>
            </label>
            {templateError && (
              <p className="text-xs text-warning">{templateError}</p>
            )}
            <p className="text-xs text-textMuted">
              Confirm each target field. Extra source columns are ignored. Each
              source column may be used once.
            </p>
            <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-borderSoft p-3">
              {FIELDS.map((field) => (
                <label key={field} className="block text-xs capitalize">
                  {fieldLabel(field)}
                  <select
                    aria-label={`Map ${field}`}
                    disabled={busy}
                    className="field mt-1"
                    value={
                      inspection.headers.includes(options.mapping[field])
                        ? options.mapping[field]
                        : ""
                    }
                    onChange={(e) =>
                      changeOptions({
                        ...options,
                        mapping: {
                          ...options.mapping,
                          [field]: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="">Choose source column</option>
                    {inspection.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {!complete && (
              <p className="text-xs text-warning">
                Map all 12 fields to different columns before previewing.
              </p>
            )}
            <details className="subcard">
              <summary className="cursor-pointer text-sm">
                Additional validation rules
              </summary>
              <p className="my-3 text-xs text-textMuted">
                Rules add restrictions to the transaction schema. Required
                fields and business checks always apply.
              </p>
              <label className="block text-xs">
                Rule field
                <select
                  className="field mt-1"
                  disabled={busy}
                  value={ruleField}
                  onChange={(e) => setRuleField(e.target.value)}
                >
                  {FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {fieldLabel(f)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-xs">
                Allowed values (one per line)
                <textarea
                  className="field mt-1"
                  disabled={busy}
                  rows={3}
                  value={rule.allowed_values?.join("\n") ?? ""}
                  onChange={(e) =>
                    changeRule({
                      allowed_values: e.target.value
                        ? e.target.value.split("\n")
                        : [],
                    })
                  }
                />
              </label>
              {["order_amount", "quantity", "discount_percent"].includes(
                ruleField,
              ) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["minimum", "maximum"] as const).map((bound) => (
                    <label key={bound} className="text-xs capitalize">
                      {bound}
                      <input
                        className="field mt-1"
                        type="number"
                        step="any"
                        disabled={busy}
                        value={rule[bound] ?? ""}
                        onChange={(e) =>
                          changeRule({
                            [bound]:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
              {["signup_date", "last_login_date"].includes(ruleField) && (
                <label className="mt-3 block text-xs">
                  Input date format
                  <select
                    className="field mt-1"
                    disabled={busy}
                    value={rule.date_format ?? "%Y-%m-%d"}
                    onChange={(e) =>
                      changeRule({ date_format: e.target.value })
                    }
                  >
                    <option value="%Y-%m-%d">YYYY-MM-DD</option>
                    <option value="%d/%m/%Y">DD/MM/YYYY</option>
                    <option value="%m/%d/%Y">MM/DD/YYYY</option>
                  </select>
                </label>
              )}
              <p className="mt-3 text-xs text-textMuted">
                Configured fields:{" "}
                {Object.keys(options.rules).join(", ") || "none"}
              </p>
              <button
                className="mt-2 text-xs underline"
                disabled={busy}
                onClick={() => {
                  const next = { ...options.rules };
                  delete next[ruleField];
                  changeOptions({ ...options, rules: next });
                }}
              >
                Clear rules for this field
              </button>
            </details>
            <details className="subcard">
              <summary className="cursor-pointer text-sm">
                Save this configuration
              </summary>
              <label className="mt-3 block text-xs">
                Template name
                <input
                  className="field mt-1"
                  maxLength={80}
                  disabled={busy}
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="button-secondary"
                  disabled={!complete || !templateName.trim() || busy}
                  onClick={() => void saveTemplate(false)}
                >
                  Save new template
                </button>
                {selectedTemplate && (
                  <button
                    className="button-secondary"
                    disabled={!complete || !templateName.trim() || busy}
                    onClick={() => void saveTemplate(true)}
                  >
                    Save new version
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-textMuted">
                Existing jobs retain their original mapping and rule snapshot.
              </p>
            </details>
            <button
              className="button-secondary w-full"
              disabled={!complete || busy}
              onClick={() => void runPreview()}
            >
              Preview validation
            </button>
            {preview && (
              <div className="subcard space-y-3">
                <h3 className="text-sm font-medium">
                  Preview · first {preview.rows.length} records
                </h3>
                <p className="text-xs text-textMuted">
                  Sample field checks only. The worker checks every record and
                  detects duplicates during processing.
                </p>
                {preview.rows.map((row) => (
                  <div
                    key={row.row_number}
                    className="border-t border-borderSoft pt-2 text-xs"
                  >
                    <strong>Record {row.row_number}</strong>
                    <span className="ml-2 break-all text-textMuted">
                      {row.values.customer_id || "No customer ID"}
                    </span>
                    <p
                      className={
                        row.issues.length
                          ? "mt-1 text-warning"
                          : "mt-1 text-success"
                      }
                    >
                      {row.issues.map((i) => i.message).join("; ") ||
                        "Field checks passed"}
                    </p>
                  </div>
                ))}
                {!preview.rows.length && (
                  <p className="text-xs text-warning">
                    No data records. Processing will record a failed job.
                  </p>
                )}
              </div>
            )}
            <button
              className="button-primary w-full"
              disabled={!preview || busy || !complete}
              onClick={() => void upload()}
            >
              Upload and Analyze CSV
            </button>
          </>
        )}
      </div>
    </SectionCard>
  );
}
