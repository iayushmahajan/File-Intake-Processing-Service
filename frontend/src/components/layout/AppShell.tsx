import { useRef, useState } from "react";
import { HeroSection } from "./HeroSection";
import { JobsPanel } from "../panels/JobsPanel";
import { ResultsPanel } from "../panels/ResultsPanel";
import { UploadPanel, type UploadResult } from "../panels/UploadPanel";

export function AppShell() {
    const [latestResult, setLatestResult] = useState<UploadResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [jobsRefreshKey, setJobsRefreshKey] = useState(0);

    const resultsRef = useRef<HTMLDivElement | null>(null);

    function scrollToResults() {
        window.setTimeout(() => {
            resultsRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 100);
    }

    return (
        <div className="min-h-screen">
            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
                <HeroSection />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-6">
                        <UploadPanel
                            onUploadStart={() => {
                                setIsProcessing(true);
                                scrollToResults();
                            }}
                            onUploadComplete={(result) => {
                                setLatestResult(result);
                                setIsProcessing(false);
                                setJobsRefreshKey((current) => current + 1);
                            }}
                            onUploadError={() => setIsProcessing(false)}
                        />

                        <div ref={resultsRef} className="scroll-mt-6">
                            <ResultsPanel result={latestResult} isLoading={isProcessing} />
                        </div>
                    </div>

                    <div>
                        <JobsPanel refreshKey={jobsRefreshKey} />
                    </div>
                </div>
            </div>
        </div>
    );
}