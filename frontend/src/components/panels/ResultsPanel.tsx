import { SectionCard } from "../layout/SectionCard";
import type { UploadResult } from "./UploadPanel";

type ResultsPanelProps = {
    result: UploadResult | null;
};

export function ResultsPanel({ result }: ResultsPanelProps) {
    const summary = result?.processing_summary;

    return (
        <SectionCard
            title="Processing Summary"
            description="Upload results and selected job details will appear here."
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-borderSoft bg-surfaceSoft/50 px-4 py-4">
                    <p className="text-sm font-medium text-textMain">
                        {result ? result.message : "No results yet"}
                    </p>

                    <p className="mt-1 text-sm text-textMuted">
                        {result
                            ? `Job #${result.job_id} created for ${result.original_filename}.`
                            : "Once a file is uploaded, this area will show processing status, row counts, job ID, and output file details."}
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

                {summary ? (
                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3 text-sm text-textMuted">
                        <p>
                            Clean output:{" "}
                            <span className="text-textMain">{summary.cleaned_filename}</span>
                        </p>
                        <p className="mt-1">
                            Error report:{" "}
                            <span className="text-textMain">{summary.error_filename}</span>
                        </p>
                    </div>
                ) : null}
            </div>
        </SectionCard>
    );
}