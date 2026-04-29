import { SectionCard } from "../layout/SectionCard";
import type { UploadResult } from "./UploadPanel";

type ResultsPanelProps = {
    result: UploadResult | null;
    isLoading?: boolean;
};

const VALIDATION_RULES = [
    "customer_id is required",
    "email must be valid",
    "country must be one of DE, FR, IN, US, GB",
    "currency must be one of EUR, USD, INR",
    "payment_method must be card, paypal, or bank_transfer",
    "order_status must be completed, pending, or cancelled",
    "quantity must be greater than 0",
    "discount_percent must be between 0 and 100",
    "country and currency must match business rules",
];

function getPercentage(value: number, total: number) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

function formatMetric(value: number | null) {
    if (value === null) return "—";
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatColumnLabel(value: string) {
    return value
        .split("_")
        .map((word) => word[0]?.toUpperCase() + word.slice(1))
        .join(" ");
}

export function ResultsPanel({ result, isLoading = false }: ResultsPanelProps) {
    const summary = result?.processing_summary;
    const analysis = summary?.analysis;

    const totalRows = summary?.total_rows ?? 0;
    const validRows = summary?.valid_rows ?? 0;
    const invalidRows = summary?.invalid_rows ?? 0;

    const validPercentage = getPercentage(validRows, totalRows);
    const invalidPercentage = getPercentage(invalidRows, totalRows);

    const hasResult = Boolean(summary);
    const isPerfect = hasResult && invalidRows === 0;
    const hasErrors = hasResult && invalidRows > 0;

    const errorBreakdown = Object.entries(summary?.error_breakdown ?? {});
    const numericProfiles = Object.entries(analysis?.profiling.numeric ?? {});
    const categoricalProfiles = Object.entries(
        analysis?.profiling.categorical ?? {}
    );
    const errorPatterns = analysis?.error_patterns ?? [];
    const anomalies = analysis?.anomalies ?? [];
    const insights = analysis?.insights ?? [];

    return (
        <SectionCard
            title="Processing Summary"
            description="Review row quality, validation rules, and generated data quality insights."
        >
            <div
                className={`space-y-5 transition-all duration-500 ${hasResult ? "opacity-100" : "opacity-90"
                    }`}
            >
                <div
                    className={`rounded-xl border px-4 py-4 transition-all duration-500 ${isLoading
                            ? "border-accent/30 bg-accent/10"
                            : isPerfect
                                ? "border-green-500/20 bg-green-500/10"
                                : hasErrors
                                    ? "border-yellow-500/20 bg-yellow-500/10"
                                    : "border-borderSoft bg-surfaceSoft/50"
                        }`}
                >
                    <p className="text-sm font-medium text-textMain">
                        {isLoading
                            ? "Processing file..."
                            : result
                                ? result.message
                                : "No results yet"}
                    </p>

                    <p className="mt-1 text-sm text-textMuted">
                        {isLoading
                            ? "The uploaded CSV is being validated, transformed, and analyzed."
                            : result
                                ? `Job #${result.job_id} created for ${result.original_filename}.`
                                : "Once a file is uploaded, this area will show validation results and data quality analysis."}
                    </p>
                </div>

                <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-4">
                    <p className="text-sm font-medium text-textMain">Validation Rules</p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {VALIDATION_RULES.map((rule) => (
                            <div
                                key={rule}
                                className="rounded-lg border border-borderSoft bg-surfaceSoft/40 px-3 py-2 text-xs text-textMuted"
                            >
                                {rule}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-textMuted">
                            Total Rows
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-textMain">
                            {summary?.total_rows ?? "—"}
                        </p>
                    </div>

                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-textMuted">
                            Valid Rows
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-success">
                            {summary?.valid_rows ?? "—"}
                        </p>
                    </div>

                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-textMuted">
                            Invalid Rows
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-danger">
                            {summary?.invalid_rows ?? "—"}
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-textMain">
                                Valid vs Invalid Rows
                            </p>
                            <p className="mt-1 text-xs text-textMuted">
                                {summary
                                    ? `${validPercentage}% valid, ${invalidPercentage}% invalid`
                                    : "Upload a CSV file to see the processing ratio."}
                            </p>
                        </div>

                        {summary ? (
                            <p
                                className={`text-sm font-semibold ${isPerfect ? "text-success" : "text-textMain"
                                    }`}
                            >
                                {validPercentage}%
                            </p>
                        ) : null}
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-surfaceSoft">
                        {summary ? (
                            <div className="flex h-full w-full">
                                <div
                                    className="h-full bg-success transition-all duration-700"
                                    style={{ width: `${validPercentage}%` }}
                                />
                                <div
                                    className="h-full bg-danger transition-all duration-700"
                                    style={{ width: `${invalidPercentage}%` }}
                                />
                            </div>
                        ) : (
                            <div className="h-full w-0 bg-success" />
                        )}
                    </div>

                    {summary ? (
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-textMuted">
                            <span className="inline-flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-success" />
                                {validRows} valid
                            </span>

                            <span className="inline-flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                                {invalidRows} invalid
                            </span>
                        </div>
                    ) : null}
                </div>

                {insights.length > 0 ? (
                    <div className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-4">
                        <p className="text-sm font-medium text-textMain">
                            Data Quality Insights
                        </p>
                        <div className="mt-3 space-y-2">
                            {insights.map((insight) => (
                                <p
                                    key={insight}
                                    className="rounded-lg border border-borderSoft bg-background/40 px-3 py-2 text-sm text-textMain"
                                >
                                    {insight}
                                </p>
                            ))}
                        </div>
                    </div>
                ) : null}

                {numericProfiles.length > 0 ? (
                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-4">
                        <p className="text-sm font-medium text-textMain">
                            Numeric Profiling
                        </p>
                        <p className="mt-1 text-xs text-textMuted">
                            Basic statistics calculated from valid rows.
                        </p>

                        <div className="mt-3 grid gap-3 lg:grid-cols-3">
                            {numericProfiles.map(([column, profile]) => (
                                <div
                                    key={column}
                                    className="rounded-lg border border-borderSoft bg-surfaceSoft/40 px-3 py-3"
                                >
                                    <p className="text-sm font-medium text-textMain">
                                        {formatColumnLabel(column)}
                                    </p>

                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <p className="text-textMuted">Min</p>
                                            <p className="font-medium text-textMain">
                                                {formatMetric(profile.min)}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-textMuted">Max</p>
                                            <p className="font-medium text-textMain">
                                                {formatMetric(profile.max)}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-textMuted">Average</p>
                                            <p className="font-medium text-textMain">
                                                {formatMetric(profile.average)}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-textMuted">Count</p>
                                            <p className="font-medium text-textMain">
                                                {profile.count}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {categoricalProfiles.length > 0 ? (
                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-4">
                        <p className="text-sm font-medium text-textMain">
                            Categorical Profiling
                        </p>
                        <p className="mt-1 text-xs text-textMuted">
                            Top values detected in valid rows.
                        </p>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {categoricalProfiles.map(([column, values]) => (
                                <div
                                    key={column}
                                    className="rounded-lg border border-borderSoft bg-surfaceSoft/40 px-3 py-3"
                                >
                                    <p className="text-sm font-medium text-textMain">
                                        {formatColumnLabel(column)}
                                    </p>

                                    <div className="mt-3 space-y-2">
                                        {values.length > 0 ? (
                                            values.map((item) => (
                                                <div
                                                    key={`${column}-${item.value}`}
                                                    className="flex items-center justify-between gap-3 text-xs"
                                                >
                                                    <span className="truncate text-textMuted">
                                                        {item.value}
                                                    </span>
                                                    <span className="font-medium text-textMain">
                                                        {item.count}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-textMuted">No values</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {hasErrors ? (
                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-4">
                        <p className="text-sm font-medium text-textMain">Error Breakdown</p>
                        <p className="mt-1 text-xs text-textMuted">
                            Grouped by validation category from the uploaded CSV.
                        </p>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {errorBreakdown.map(([category, count]) => (
                                <div
                                    key={category}
                                    className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2"
                                >
                                    <span className="text-sm text-textMain">{category}</span>
                                    <span className="text-sm font-semibold text-danger">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {errorPatterns.length > 0 ? (
                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-4">
                        <p className="text-sm font-medium text-textMain">Error Patterns</p>
                        <p className="mt-1 text-xs text-textMuted">
                            Invalid rows grouped by repeated combinations of validation errors.
                        </p>

                        <div className="mt-3 space-y-2">
                            {errorPatterns.slice(0, 5).map((pattern) => (
                                <div
                                    key={pattern.pattern}
                                    className="rounded-lg border border-borderSoft bg-surfaceSoft/40 px-3 py-2"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-xs text-textMuted">{pattern.pattern}</p>
                                        <span className="shrink-0 rounded-full border border-borderSoft px-2 py-0.5 text-xs text-textMain">
                                            {pattern.count}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {anomalies.length > 0 ? (
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-4">
                        <p className="text-sm font-medium text-textMain">
                            Business Anomalies
                        </p>
                        <p className="mt-1 text-xs text-textMuted">
                            Potentially unusual values detected in valid rows.
                        </p>

                        <div className="mt-3 space-y-2">
                            {anomalies.slice(0, 5).map((anomaly) => (
                                <div
                                    key={`${anomaly.row}-${anomaly.column}-${anomaly.value}`}
                                    className="rounded-lg border border-borderSoft bg-background/40 px-3 py-2"
                                >
                                    <p className="text-sm text-textMain">{anomaly.message}</p>
                                    <p className="mt-1 text-xs text-textMuted">
                                        Row {anomaly.row}, {formatColumnLabel(anomaly.column)}:{" "}
                                        {anomaly.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {summary ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-textMuted">
                                Clean Output
                            </p>
                            <p className="mt-2 break-all text-sm text-textMain">
                                {summary.cleaned_filename || "No clean file generated"}
                            </p>
                        </div>

                        <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-textMuted">
                                Error Report
                            </p>
                            <p className="mt-2 break-all text-sm text-textMain">
                                {summary.error_filename}
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>
        </SectionCard>
    );
}