import { useState } from "react";
import { HeroSection } from "./HeroSection";
import { JobsPanel } from "../panels/JobsPanel";
import { ResultsPanel } from "../panels/ResultsPanel";
import { UploadPanel, type UploadResult } from "../panels/UploadPanel";

export function AppShell() {
    const [latestResult, setLatestResult] = useState<UploadResult | null>(null);

    return (
        <div className="min-h-screen">
            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
                <HeroSection />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-6">
                        <UploadPanel onUploadComplete={setLatestResult} />
                        <ResultsPanel result={latestResult} />
                    </div>

                    <div>
                        <JobsPanel />
                    </div>
                </div>
            </div>
        </div>
    );
}