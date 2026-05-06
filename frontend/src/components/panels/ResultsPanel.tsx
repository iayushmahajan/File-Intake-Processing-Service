import { useEffect, useState } from "react";
import { SectionCard } from "../layout/SectionCard";
import type { UploadResult } from "./UploadPanel";

type ResultsPanelProps = {
    result: UploadResult | null;
    isLoading?: boolean;
};

type AiReport = {
    quality_score: number;
    severity: "low" | "medium" | "high";
    executive_summary: string;
    key_issues: string[];
    recommended_actions: string[];
    business_impact: string;
};

type AiAnalysisResponse = {
    report?: AiReport | null;
    raw_response?: string;
    error?: string;
};

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

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

function getSeverityClass(severity?: string) {
    if (severity === "high") {
        return "border-red-500/20 bg-red-500/10 text-red-300";
    }

    if (severity === "medium") {
        return "border-yellow-500/20 bg-yellow-500/10 text-yellow-200";
    }

    return "border-green-500/20 bg-green-500/10 text-green-300";
}

function downloadAiReport(filename: string, report: AiReport) {
    const markdown = `# AI Data Quality Report

## File
${filename}

## Quality Score
${report.quality_score}/100

## Severity
${report.severity.toUpperCase()}

## Executive Summary
${report.executive_summary}

## Key Issues
${report.key_issues.map((issue) => `- ${issue}`).join("\n")}

## Recommended Actions
${report.recommended_actions.map((action) => `- ${action}`).join("\n")}

## Business Impact
${report.business_impact}
`;

    const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeFilename = filename.replace(/\.csv$/i, "");
    link.href = url;
    link.download = `${safeFilename}_ai_report.md`;
    link.click();

    URL.revokeObjectURL(url);
}

export function ResultsPanel({ result, isLoading = false }: ResultsPanelProps) {
    const summary = result?.processing_summary;

    const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResponse | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const totalRows = summary?.total_rows ?? 0;
    const validRows = summary?.valid_rows ?? 0;
    const invalidRows = summary?.invalid_rows ?? 0;

    const validPercentage = getPercentage(validRows, totalRows);
    const invalidPercentage = getPercentage(invalidRows, totalRows);

    const hasResult = Boolean(summary);
    const isPerfect = hasResult && invalidRows === 0;
    const hasErrors = hasResult && invalidRows > 0;

    const errorBreakdown = Object.entries(summary?.error_breakdown ?? {});

    useEffect(() => {
        async function generateAiAnalysis(jobId: number) {
            try {
                setIsAiLoading(true);
                setAiAnalysis(null);

                const response = await fetch(
                    `${API_BASE_URL}/api/v1/jobs/${jobId}/ai-analysis`,
                    {
                        method: "POST",
                    }
                );

                if (!response.ok) {
                    throw new Error("Could not generate AI analysis.");
                }

                const data = (await response.json()) as AiAnalysisResponse;
                setAiAnalysis(data);
            } catch (error) {
                setAiAnalysis({
                    error:
                        error instanceof Error ? error.message : "Something went wrong.",
                });
            } finally {
                setIsAiLoading(false);
            }
        }

        if (result?.job_id) {
            generateAiAnalysis(result.job_id);
        } else {
            setAiAnalysis(null);
        }
    }, [result?.job_id]);

    const aiReport = aiAnalysis?.report ?? null;

    return (
        <SectionCard
            title="Processing Summary"
            description="Review validation results and AI-generated data quality analysis."
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
                                : "Once a file is uploaded, this area will show validation results and AI analysis."}
                    </p>
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

                <div className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-textMain">
                                AI Data Quality Analysis
                            </p>
                            <p className="mt-1 text-xs text-textMuted">
                                Automatically generated from validation results, file samples,
                                and detected data issues.
                            </p>
                        </div>

                        {aiReport && result ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <div
                                    className={`rounded-full border px-3 py-1 text-xs font-medium ${getSeverityClass(
                                        aiReport.severity
                                    )}`}
                                >
                                    {aiReport.severity.toUpperCase()} · Score{" "}
                                    {aiReport.quality_score}/100
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        downloadAiReport(result.original_filename, aiReport)
                                    }
                                    className="rounded-full border border-borderSoft px-3 py-1 text-xs font-medium text-textMain transition hover:border-accent"
                                >
                                    Download Report
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {isAiLoading ? (
                        <div className="mt-4 rounded-lg border border-borderSoft bg-background/50 px-3 py-3 text-sm text-textMuted">
                            Generating AI analysis...
                        </div>
                    ) : null}

                    {aiAnalysis?.error ? (
                        <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-3 text-sm text-yellow-200">
                            {aiAnalysis.error}
                        </div>
                    ) : null}

                    {aiReport ? (
                        <div className="mt-4 space-y-4">
                            <div className="rounded-lg border border-borderSoft bg-background/50 px-3 py-3">
                                <p className="text-xs uppercase tracking-wide text-textMuted">
                                    Executive Summary
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-textMain">
                                    {aiReport.executive_summary}
                                </p>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-2">
                                <div className="rounded-lg border border-borderSoft bg-background/50 px-3 py-3">
                                    <p className="text-xs uppercase tracking-wide text-textMuted">
                                        Key Issues
                                    </p>

                                    <div className="mt-2 space-y-2">
                                        {aiReport.key_issues.map((issue) => (
                                            <p key={issue} className="text-sm text-textMain">
                                                • {issue}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-borderSoft bg-background/50 px-3 py-3">
                                    <p className="text-xs uppercase tracking-wide text-textMuted">
                                        Recommended Actions
                                    </p>

                                    <div className="mt-2 space-y-2">
                                        {aiReport.recommended_actions.map((action) => (
                                            <p key={action} className="text-sm text-textMain">
                                                • {action}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-borderSoft bg-background/50 px-3 py-3">
                                <p className="text-xs uppercase tracking-wide text-textMuted">
                                    Business Impact
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-textMain">
                                    {aiReport.business_impact}
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>

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