import { SectionCard } from "../layout/SectionCard";

export function ResultsPanel() {
    return (
        <SectionCard
            title="Processing Summary"
            description="Upload results and selected job details will appear here."
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-borderSoft bg-surfaceSoft/50 px-4 py-4">
                    <p className="text-sm font-medium text-textMain">No results yet</p>
                    <p className="mt-1 text-sm text-textMuted">
                        Once a file is uploaded, this area will show processing status, row
                        counts, job ID, and output file details.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-textMuted">Total Rows</p>
                        <p className="mt-2 text-2xl font-semibold text-textMain">—</p>
                    </div>

                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-textMuted">Valid Rows</p>
                        <p className="mt-2 text-2xl font-semibold text-success">—</p>
                    </div>

                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-textMuted">Invalid Rows</p>
                        <p className="mt-2 text-2xl font-semibold text-danger">—</p>
                    </div>
                </div>
            </div>
        </SectionCard>
    );
}