export function HeroSection() {
    return (
        <section className="rounded-3xl border border-borderSoft bg-surface/80 px-8 py-10 shadow-glow backdrop-blur-sm">
            <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
                    Internal Workflow Demo
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-textMain sm:text-4xl">
                    File Intake & Processing
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-textMuted sm:text-lg">
                    Upload customer CSV files, validate records, generate clean outputs and
                    error reports, and track processing jobs through a polished internal-tool
                    workflow.
                </p>

                <div className="mt-6 flex flex-wrap gap-3 text-sm text-textMuted">
                    <span className="rounded-full border border-borderSoft bg-surfaceSoft px-3 py-1">
                        FastAPI Backend
                    </span>
                    <span className="rounded-full border border-borderSoft bg-surfaceSoft px-3 py-1">
                        Job Tracking
                    </span>
                    <span className="rounded-full border border-borderSoft bg-surfaceSoft px-3 py-1">
                        CSV Validation
                    </span>
                    <span className="rounded-full border border-borderSoft bg-surfaceSoft px-3 py-1">
                        Downloadable Outputs
                    </span>
                </div>
            </div>
        </section>
    );
}