import { SectionCard } from "../layout/SectionCard";

const mockJobs = [
    { id: "JOB-1042", name: "customer_import_april.csv", status: "Completed" },
    { id: "JOB-1041", name: "invalid_sample.csv", status: "Completed" },
    { id: "JOB-1040", name: "batch_upload.csv", status: "Completed" },
];

export function JobsPanel() {
    return (
        <SectionCard
            title="Recent Jobs"
            description="Processed jobs will be listed here."
            action={
                <button
                    type="button"
                    className="rounded-lg border border-borderSoft px-3 py-1.5 text-sm text-textMuted transition hover:border-accent hover:text-textMain"
                >
                    Refresh
                </button>
            }
            className="h-full"
        >
            <div className="space-y-3">
                <input
                    type="text"
                    placeholder="Search jobs..."
                    className="w-full rounded-xl border border-borderSoft bg-background/40 px-4 py-2.5 text-sm text-textMain outline-none placeholder:text-textMuted focus:border-accent"
                    disabled
                />

                <div className="space-y-2">
                    {mockJobs.map((job) => (
                        <button
                            key={job.id}
                            type="button"
                            className="w-full rounded-xl border border-borderSoft bg-background/40 px-4 py-3 text-left transition hover:border-accent hover:bg-surfaceSoft"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-medium text-textMain">{job.name}</p>
                                <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs text-green-300">
                                    {job.status}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-textMuted">{job.id}</p>
                        </button>
                    ))}
                </div>
            </div>
        </SectionCard>
    );
}