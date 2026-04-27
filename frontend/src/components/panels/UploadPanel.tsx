import { SectionCard } from "../layout/SectionCard";

export function UploadPanel() {
    return (
        <SectionCard
            title="Upload File"
            description="Select a customer CSV file to validate and process."
        >
            <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-borderSoft bg-surfaceSoft/70 px-6 py-10 text-center">
                    <div className="mx-auto max-w-md">
                        <p className="text-base font-medium text-textMain">
                            Drag and drop a CSV file here
                        </p>
                        <p className="mt-2 text-sm text-textMuted">
                            Or click to choose a file. Frontend validation and upload behavior
                            will be added in the next phase.
                        </p>

                        <button
                            type="button"
                            className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accentSoft"
                        >
                            Choose File
                        </button>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-textMuted">
                            Selected file
                        </p>
                        <p className="mt-1 text-sm text-textMain">No file selected yet</p>
                    </div>

                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-textMuted">
                            Validation status
                        </p>
                        <p className="mt-1 text-sm text-textMain">Waiting for input</p>
                    </div>
                </div>
            </div>
        </SectionCard>
    );
}