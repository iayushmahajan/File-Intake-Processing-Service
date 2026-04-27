import { SectionCard } from "../layout/SectionCard";
import type { UploadResult } from "./UploadPanel";

type ResultsPanelProps = {
    result: UploadResult | null;
};

function getPercentage(value: number, total: number) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

export function ResultsPanel({ result }: ResultsPanelProps) {
    const summary = result?.processing_summary;

    const totalRows = summary?.total_rows ?? 0;
    const validRows = summary?.valid_rows ?? 0;
    const invalidRows = summary?.invalid_rows ?? 0;

    const validPercentage = getPercentage(validRows, totalRows);
    const invalidPercentage = getPercentage(invalidRows, totalRows);

    return (
        <SectionCard
            title="Processing Summary"
            description="Review row quality and generated output details."
        >
            <div className="space-y-5">
                <div className="rounded-xl border border-borderSoft bg-surfaceSoft/50 px-4 py-4">
                    <p className="text-sm font-medium text-textMain">
                        {result ? result.message : "No results yet"}
                    </p>

                    <p className="mt-1 text-sm text-textMuted">
                        {result
                            ? `Job #${result.job_id} created for ${result.original_filename}.`
                            : "Once a file is uploaded, this area will show row quality, validation ratio, and generated output details."}
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
                            <p className="text-sm font-semibold text-success">
                                {validPercentage}%
                            </p>
                        ) : null}
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-surfaceSoft">
                        {summary ? (
                            <div className="flex h-full w-full">
                                <div
                                    className="h-full bg-success transition-all duration-500"
                                    style={{ width: `${validPercentage}%` }}
                                />
                                <div
                                    className="h-full bg-danger transition-all duration-500"
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

                {summary ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-textMuted">
                                Clean Output
                            </p>
                            <p className="mt-2 break-all text-sm text-textMain">
                                {summary.cleaned_filename}
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