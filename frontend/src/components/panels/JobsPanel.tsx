import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../layout/SectionCard";

type Job = {
    id: number;
    filename_original: string;
    filename_input_saved: string;
    filename_cleaned: string;
    filename_error_report: string;
    status: string;
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    error_message: string | null;
    created_at: string;
    processed_at: string;
};

type JobsResponse = {
    jobs: Job[];
};

type JobsPanelProps = {
    refreshKey?: number;
};

type PreviewFileType = "input" | "clean" | "errors";

type PreviewState = {
    isOpen: boolean;
    title: string;
    filename: string;
    rows: string[][];
    isLoading: boolean;
    errorMessage: string | null;
};

type AiAnalysisResponse = {
    raw_response?: string;
    error?: string;
};

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const JOBS_PER_PAGE = 10;
const PREVIEW_ROW_LIMIT = 25;

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getDownloadUrl(jobId: number, fileType: PreviewFileType) {
    return `${API_BASE_URL}/api/v1/jobs/${jobId}/download/${fileType}`;
}

function parseCsvLine(line: string) {
    const values: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        const nextCharacter = line[index + 1];

        if (character === '"' && insideQuotes && nextCharacter === '"') {
            current += '"';
            index += 1;
            continue;
        }

        if (character === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (character === "," && !insideQuotes) {
            values.push(current);
            current = "";
            continue;
        }

        current += character;
    }

    values.push(current);
    return values;
}

function parseCsvPreview(csvText: string) {
    return csvText
        .trim()
        .split(/\r?\n/)
        .slice(0, PREVIEW_ROW_LIMIT + 1)
        .map(parseCsvLine);
}

function getFileLabel(fileType: PreviewFileType) {
    if (fileType === "input") return "Original Upload";
    if (fileType === "clean") return "Cleaned Output";
    return "Error Report";
}

export function JobsPanel({ refreshKey = 0 }: JobsPanelProps) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [copiedJobId, setCopiedJobId] = useState<number | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResponse | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const [preview, setPreview] = useState<PreviewState>({
        isOpen: false,
        title: "",
        filename: "",
        rows: [],
        isLoading: false,
        errorMessage: null,
    });

    async function fetchJobs() {
        try {
            setIsLoading(true);
            setErrorMessage(null);

            const response = await fetch(`${API_BASE_URL}/api/v1/jobs`);

            if (!response.ok) {
                throw new Error("Could not load jobs.");
            }

            const data = (await response.json()) as JobsResponse;
            setJobs(data.jobs);

            setSelectedJob((currentSelectedJob) => {
                if (!data.jobs.length) return null;

                if (!currentSelectedJob) {
                    return data.jobs[0];
                }

                return (
                    data.jobs.find((job) => job.id === currentSelectedJob.id) ??
                    data.jobs[0]
                );
            });
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : "Something went wrong."
            );
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchJobs();
    }, [refreshKey]);

    const availableStatuses = useMemo(() => {
        return Array.from(new Set(jobs.map((job) => job.status)));
    }, [jobs]);

    const filteredJobs = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return jobs.filter((job) => {
            const matchesSearch =
                job.filename_original.toLowerCase().includes(normalizedSearch) ||
                String(job.id).includes(normalizedSearch);

            const matchesStatus =
                statusFilter === "all" || job.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [jobs, searchTerm, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));

    const paginatedJobs = filteredJobs.slice(
        (currentPage - 1) * JOBS_PER_PAGE,
        currentPage * JOBS_PER_PAGE
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    async function handleCopyJobId(jobId: number) {
        await navigator.clipboard.writeText(String(jobId));
        setCopiedJobId(jobId);

        window.setTimeout(() => {
            setCopiedJobId(null);
        }, 1500);
    }

    async function handleOpenPreview(job: Job, fileType: PreviewFileType) {
        const filename =
            fileType === "input"
                ? job.filename_input_saved
                : fileType === "clean"
                    ? job.filename_cleaned
                    : job.filename_error_report;

        setPreview({
            isOpen: true,
            title: getFileLabel(fileType),
            filename,
            rows: [],
            isLoading: true,
            errorMessage: null,
        });

        try {
            const response = await fetch(getDownloadUrl(job.id, fileType));

            if (!response.ok) {
                const errorBody = await response.json().catch(() => null);
                throw new Error(errorBody?.detail ?? "Could not load file preview.");
            }

            const csvText = await response.text();

            setPreview((current) => ({
                ...current,
                rows: parseCsvPreview(csvText),
                isLoading: false,
            }));
        } catch (error) {
            setPreview((current) => ({
                ...current,
                rows: [],
                isLoading: false,
                errorMessage:
                    error instanceof Error ? error.message : "Something went wrong.",
            }));
        }
    }

    async function handleGenerateAiAnalysis(jobId: number) {
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
                error: error instanceof Error ? error.message : "Something went wrong.",
            });
        } finally {
            setIsAiLoading(false);
        }
    }

    function closePreview() {
        setPreview({
            isOpen: false,
            title: "",
            filename: "",
            rows: [],
            isLoading: false,
            errorMessage: null,
        });
    }

    const previewHeaders = preview.rows[0] ?? [];
    const previewRows = preview.rows.slice(1);

    return (
        <>
            <SectionCard
                title="Recent Jobs"
                description="Search, filter, and inspect processed CSV jobs."
                className="h-full"
            >
                <div className="space-y-4">
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search by filename or job ID..."
                            className="w-full rounded-xl border border-borderSoft bg-background/60 px-3 py-2 text-sm text-textMain outline-none transition placeholder:text-textMuted focus:border-accent"
                        />

                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="min-w-0 flex-1 rounded-xl border border-borderSoft bg-background/60 px-3 py-2 text-sm text-textMain outline-none transition focus:border-accent"
                            >
                                <option value="all">All statuses</option>
                                {availableStatuses.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={fetchJobs}
                                disabled={isLoading}
                                className="rounded-xl border border-borderSoft px-3 py-2 text-sm text-textMain transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isLoading ? "..." : "Refresh"}
                            </button>
                        </div>
                    </div>

                    {errorMessage ? (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                            {errorMessage}
                        </div>
                    ) : null}

                    <div className="space-y-3">
                        {paginatedJobs.length > 0 ? (
                            paginatedJobs.map((job) => {
                                const isSelected = selectedJob?.id === job.id;

                                return (
                                    <button
                                        key={job.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedJob(job);
                                            setAiAnalysis(null);
                                        }}
                                        className={`w-full rounded-xl border px-4 py-3 text-left transition ${isSelected
                                                ? "border-accent bg-accent/10"
                                                : "border-borderSoft bg-background/40 hover:border-accent/60"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-textMain">
                                                    {job.filename_original}
                                                </p>
                                                <p className="mt-1 text-xs text-textMuted">
                                                    Job #{job.id}
                                                </p>
                                            </div>

                                            <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-xs text-green-300">
                                                {job.status}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-6 text-center text-sm text-textMuted">
                                {isLoading ? "Loading jobs..." : "No jobs found."}
                            </div>
                        )}
                    </div>

                    {filteredJobs.length > JOBS_PER_PAGE ? (
                        <div className="flex items-center justify-between gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={currentPage === 1}
                                className="rounded-lg border border-borderSoft px-3 py-1.5 text-xs text-textMain transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>

                            <p className="text-xs text-textMuted">
                                Page {currentPage} of {totalPages}
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                                }
                                disabled={currentPage === totalPages}
                                className="rounded-lg border border-borderSoft px-3 py-1.5 text-xs text-textMain transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    ) : null}

                    {selectedJob ? (
                        <div className="rounded-xl border border-borderSoft bg-surfaceSoft/50 px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-textMain">
                                        Selected Job
                                    </p>
                                    <p className="mt-1 text-xs text-textMuted">
                                        Job #{selectedJob.id}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleCopyJobId(selectedJob.id)}
                                    className="rounded-lg border border-borderSoft px-2 py-1 text-xs text-textMain transition hover:border-accent"
                                >
                                    {copiedJobId === selectedJob.id ? "Copied" : "Copy ID"}
                                </button>
                            </div>

                            <div className="mt-4 space-y-2 text-sm">
                                <div className="flex justify-between gap-3">
                                    <span className="text-textMuted">File</span>
                                    <span className="break-all text-right text-textMain">
                                        {selectedJob.filename_original}
                                    </span>
                                </div>

                                <div className="flex justify-between gap-3">
                                    <span className="text-textMuted">Rows</span>
                                    <span className="text-textMain">
                                        {selectedJob.valid_rows}/{selectedJob.total_rows} valid
                                    </span>
                                </div>

                                <div className="flex justify-between gap-3">
                                    <span className="text-textMuted">Invalid</span>
                                    <span className="text-danger">{selectedJob.invalid_rows}</span>
                                </div>

                                <div className="flex justify-between gap-3">
                                    <span className="text-textMuted">Created</span>
                                    <span className="text-right text-textMain">
                                        {formatDate(selectedJob.created_at)}
                                    </span>
                                </div>

                                <div className="flex justify-between gap-3">
                                    <span className="text-textMuted">Processed</span>
                                    <span className="text-right text-textMain">
                                        {formatDate(selectedJob.processed_at)}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleOpenPreview(selectedJob, "input")}
                                    className="rounded-xl border border-borderSoft px-3 py-2 text-sm text-textMain transition hover:border-accent"
                                >
                                    Preview Original Upload
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleOpenPreview(selectedJob, "clean")}
                                    className="rounded-xl border border-borderSoft px-3 py-2 text-sm text-textMain transition hover:border-accent"
                                >
                                    Preview Cleaned File
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleOpenPreview(selectedJob, "errors")}
                                    className="rounded-xl border border-borderSoft px-3 py-2 text-sm text-textMain transition hover:border-accent"
                                >
                                    Preview Error File
                                </button>

                                <div className="grid gap-2 sm:grid-cols-2">
                                    <a
                                        href={getDownloadUrl(selectedJob.id, "clean")}
                                        className="rounded-xl bg-accent px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-accentSoft"
                                    >
                                        Download Clean
                                    </a>

                                    <a
                                        href={getDownloadUrl(selectedJob.id, "errors")}
                                        className="rounded-xl border border-borderSoft px-3 py-2 text-center text-sm text-textMain transition hover:border-accent"
                                    >
                                        Download Errors
                                    </a>
                                </div>
                            </div>

                            <div className="mt-4 rounded-xl border border-accent/20 bg-accent/10 px-4 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-textMain">
                                            AI Data Quality Analysis
                                        </p>
                                        <p className="mt-1 text-xs text-textMuted">
                                            Generate an LLM-based business summary for this processed
                                            job.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleGenerateAiAnalysis(selectedJob.id)}
                                        disabled={isAiLoading}
                                        className="rounded-xl bg-accent px-3 py-2 text-xs font-medium text-white transition hover:bg-accentSoft disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isAiLoading ? "Generating..." : "Generate"}
                                    </button>
                                </div>

                                {aiAnalysis?.error ? (
                                    <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                                        {aiAnalysis.error}
                                    </div>
                                ) : null}

                                {aiAnalysis?.raw_response ? (
                                    <div className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-borderSoft bg-background/60 px-3 py-3 text-xs leading-relaxed text-textMain">
                                        {aiAnalysis.raw_response}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </div>
            </SectionCard>

            {preview.isOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
                    <div className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-2xl border border-borderSoft bg-[#0b1220] shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-borderSoft px-5 py-4">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-textMain">
                                    {preview.title}
                                </p>
                                <p className="mt-1 break-all text-xs text-textMuted">
                                    {preview.filename}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closePreview}
                                className="rounded-lg border border-borderSoft px-3 py-1.5 text-sm text-textMain transition hover:border-accent"
                            >
                                Close
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-auto p-5">
                            {preview.isLoading ? (
                                <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-8 text-center text-sm text-textMuted">
                                    Loading preview...
                                </div>
                            ) : preview.errorMessage ? (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                    {preview.errorMessage}
                                </div>
                            ) : preview.rows.length > 0 ? (
                                <div className="overflow-auto rounded-xl border border-borderSoft">
                                    <table className="min-w-full border-collapse text-left text-sm">
                                        <thead className="bg-surfaceSoft">
                                            <tr>
                                                {previewHeaders.map((header, index) => (
                                                    <th
                                                        key={`${header}-${index}`}
                                                        className="whitespace-nowrap border-b border-borderSoft px-3 py-2 text-xs font-semibold uppercase tracking-wide text-textMuted"
                                                    >
                                                        {header || `Column ${index + 1}`}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {previewRows.map((row, rowIndex) => (
                                                <tr
                                                    key={rowIndex}
                                                    className="border-b border-borderSoft/70 last:border-b-0"
                                                >
                                                    {previewHeaders.map((_, cellIndex) => (
                                                        <td
                                                            key={cellIndex}
                                                            className="whitespace-nowrap px-3 py-2 text-xs text-textMain"
                                                        >
                                                            {row[cellIndex] || "—"}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-8 text-center text-sm text-textMuted">
                                    This file is empty.
                                </div>
                            )}

                            {!preview.isLoading &&
                                !preview.errorMessage &&
                                preview.rows.length > 0 ? (
                                <p className="mt-3 text-xs text-textMuted">
                                    Showing first {Math.min(PREVIEW_ROW_LIMIT, previewRows.length)}{" "}
                                    rows.
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}