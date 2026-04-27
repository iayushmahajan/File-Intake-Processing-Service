import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { SectionCard } from "../layout/SectionCard";

type ProcessingSummary = {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    cleaned_filename: string;
    error_filename: string;
    cleaned_path: string;
    error_path: string;
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
    onUploadComplete: (result: UploadResult) => void;
};

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function formatFileSize(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isCsvFile(file: File) {
    return file.name.toLowerCase().endsWith(".csv");
}

export function UploadPanel({ onUploadComplete }: UploadPanelProps) {
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
        } finally {
            setIsUploading(false);
        }
    }

    const canUpload = selectedFile !== null && !validationError && !isUploading;

    return (
        <SectionCard
            title="Upload File"
            description="Select a customer CSV file to validate and process."
        >
            <div className="space-y-4">
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
                            Or click to choose a file. Only customer CSV files are accepted.
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
                                (selectedFile ? "CSV file ready to upload" : "Waiting for input")}
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
                    {isUploading ? "Uploading..." : "Upload and Process CSV"}
                </button>
            </div>
        </SectionCard>
    );
}