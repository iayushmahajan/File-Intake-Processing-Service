import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { SectionCard } from "../layout/SectionCard";

type NumericProfile = {
    count: number;
    min: number | null;
    max: number | null;
    average: number | null;
};

type TopValue = {
    value: string;
    count: number;
};

type ErrorPattern = {
    pattern: string;
    count: number;
};

type BusinessAnomaly = {
    row: number;
    column: string;
    value: number;
    message: string;
};

type DataQualityAnalysis = {
    profiling: {
        numeric: Record<string, NumericProfile>;
        categorical: Record<string, TopValue[]>;
    };
    error_patterns: ErrorPattern[];
    anomalies: BusinessAnomaly[];
    insights: string[];
};

type ProcessingSummary = {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    cleaned_filename: string;
    error_filename: string;
    cleaned_path: string;
    error_path: string;
    error_breakdown: Record<string, number>;
    analysis: DataQualityAnalysis;
};

export type UploadResult = {
    message: string;
    original_filename: string;
    saved_filename: string;
    saved_path: string;
    processing_summary: ProcessingSummary;
    job_id: number;
};

type UploadPanelProps = {
    onUploadStart?: () => void;
    onUploadComplete: (result: UploadResult) => void;
    onUploadError?: () => void;
};

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const SAMPLE_CSV = `customer_id,email,country,signup_date,order_amount,currency,payment_method,order_status,product_category,quantity,discount_percent,last_login_date
CUST-001,alice@example.com,DE,2026-04-01,125.50,EUR,card,completed,electronics,2,10,2026-04-10
CUST-002,bob@example.com,IN,2026-04-03,89.99,INR,paypal,pending,clothing,1,5,2026-04-09
CUST-003,charlie@example.com,US,2026-04-05,250.00,USD,card,completed,home,3,0,2026-04-12
CUST-004,diana.example.com,FR,2026-04-07,49.90,EUR,bank_transfer,completed,books,1,15,2026-04-13
CUST-005,ethan@example.com,GB,2026-04-08,180.75,BTC,paypal,pending,electronics,2,20,2026-04-14
CUST-006,fatima@example.com,DE,2026-04-09,15.00,USD,card,cancelled,beauty,1,0,2026-04-15
`;

function formatFileSize(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isCsvFile(file: File) {
    return file.name.toLowerCase().endsWith(".csv");
}

function downloadSampleCsv() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "sample_customer_transactions.csv";
    link.click();

    URL.revokeObjectURL(url);
}

export function UploadPanel({
    onUploadStart,
    onUploadComplete,
    onUploadError,
}: UploadPanelProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState<string | null>(null);

    function handleFile(file: File) {
        setUploadMessage(null);

        if (!isCsvFile(file)) {
            setSelectedFile(null);
            setValidationError("Only .csv files are allowed.");
            return;
        }

        setSelectedFile(file);
        setValidationError(null);
    }

    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (file) handleFile(file);
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragging(false);

        const file = event.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }

    async function handleUpload() {
        if (!selectedFile || validationError) return;

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            setIsUploading(true);
            setUploadMessage(null);
            onUploadStart?.();

            const response = await fetch(`${API_BASE_URL}/api/v1/uploads`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => null);
                throw new Error(errorBody?.detail ?? "Upload failed.");
            }

            const result = (await response.json()) as UploadResult;
            onUploadComplete(result);
            setUploadMessage("Upload completed successfully.");
        } catch (error) {
            setUploadMessage(
                error instanceof Error ? error.message : "Something went wrong."
            );
            onUploadError?.();
        } finally {
            setIsUploading(false);
        }
    }

    const canUpload = selectedFile !== null && !validationError && !isUploading;

    return (
        <SectionCard
            title="Upload File"
            description="Upload a customer transaction CSV for validation, transformation, and data quality analysis."
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-textMain">
                                Expected CSV format
                            </p>
                            <p className="mt-1 text-xs text-textMuted">
                                customer_id, email, country, signup_date, order_amount,
                                currency, payment_method, order_status, product_category,
                                quantity, discount_percent, last_login_date
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={downloadSampleCsv}
                            className="rounded-xl border border-borderSoft px-3 py-2 text-sm text-textMain transition hover:border-accent"
                        >
                            Download Sample CSV
                        </button>
                    </div>
                </div>

                <div
                    onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={[
                        "rounded-2xl border border-dashed px-6 py-10 text-center transition",
                        isDragging
                            ? "border-accent bg-accent/10"
                            : "border-borderSoft bg-surfaceSoft/70",
                    ].join(" ")}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={handleInputChange}
                    />

                    <div className="mx-auto max-w-md">
                        <p className="text-base font-medium text-textMain">
                            Drag and drop a CSV file here
                        </p>

                        <p className="mt-2 text-sm text-textMuted">
                            Or click to choose a file. Only customer transaction CSV files are
                            accepted.
                        </p>

                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
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
                        <p className="mt-1 text-sm text-textMain">
                            {selectedFile ? selectedFile.name : "No file selected yet"}
                        </p>

                        {selectedFile ? (
                            <p className="mt-1 text-xs text-textMuted">
                                {formatFileSize(selectedFile.size)}
                            </p>
                        ) : null}
                    </div>

                    <div className="rounded-xl border border-borderSoft bg-background/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-textMuted">
                            Validation status
                        </p>
                        <p
                            className={`mt-1 text-sm ${validationError ? "text-danger" : "text-success"
                                }`}
                        >
                            {validationError ??
                                (selectedFile
                                    ? "CSV file ready to upload"
                                    : "Waiting for input")}
                        </p>
                    </div>
                </div>

                {uploadMessage ? (
                    <div
                        className={`rounded-xl border px-4 py-3 text-sm ${uploadMessage.includes("successfully")
                                ? "border-green-500/20 bg-green-500/10 text-green-300"
                                : "border-red-500/20 bg-red-500/10 text-red-300"
                            }`}
                    >
                        {uploadMessage}
                    </div>
                ) : null}

                <button
                    type="button"
                    disabled={!canUpload}
                    onClick={handleUpload}
                    className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accentSoft disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isUploading ? "Uploading..." : "Upload and Analyze CSV"}
                </button>
            </div>
        </SectionCard>
    );
}