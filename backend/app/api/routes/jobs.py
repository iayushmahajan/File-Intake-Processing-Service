import csv
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, desc, select

from app.core.config import INPUT_DIR, OUTPUT_DIR
from app.core.db import get_session
from app.models.processing_job import ProcessingJob
from app.schemas.job import JobListResponse, JobResponse
from app.services.llm_analyzer import generate_ai_analysis

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


def get_job_or_404(job_id: int, session: Session) -> ProcessingJob:
    job = session.get(ProcessingJob, job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    return job


def return_csv_file(file_path: Path, filename: str, not_found_message: str) -> FileResponse:
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=not_found_message)

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="text/csv",
    )


def read_csv_preview(file_path: Path, limit: int = 20) -> list[dict[str, str]]:
    if not file_path.exists() or not file_path.is_file():
        return []

    with file_path.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        return [row for _, row in zip(range(limit), reader)]


def build_llm_summary(job: ProcessingJob) -> dict[str, Any]:
    clean_path = OUTPUT_DIR / job.filename_cleaned
    error_path = OUTPUT_DIR / job.filename_error_report

    clean_rows = read_csv_preview(clean_path, limit=20)
    error_rows = read_csv_preview(error_path, limit=20)

    return {
        "job": {
            "id": job.id,
            "filename_original": job.filename_original,
            "status": job.status,
            "total_rows": job.total_rows,
            "valid_rows": job.valid_rows,
            "invalid_rows": job.invalid_rows,
            "created_at": str(job.created_at),
            "processed_at": str(job.processed_at),
        },
        "valid_row_sample": clean_rows,
        "error_row_sample": error_rows,
        "instruction_context": (
            "This file represents customer transaction upload data. "
            "The system validates customer identity, email, country, signup date, "
            "order amount, currency, payment method, order status, product category, "
            "quantity, discount percentage, and last login date."
        ),
    }


@router.get("", response_model=JobListResponse)
def list_jobs(session: Session = Depends(get_session)) -> JobListResponse:
    statement = select(ProcessingJob).order_by(desc(ProcessingJob.created_at))
    jobs = session.exec(statement).all()

    return JobListResponse(jobs=jobs)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, session: Session = Depends(get_session)) -> JobResponse:
    return get_job_or_404(job_id, session)


@router.post("/{job_id}/ai-analysis")
def generate_job_ai_analysis(
    job_id: int,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    job = get_job_or_404(job_id, session)
    summary = build_llm_summary(job)

    return generate_ai_analysis(summary)


@router.get("/{job_id}/download/input")
def download_input_file(
    job_id: int,
    session: Session = Depends(get_session),
) -> FileResponse:
    job = get_job_or_404(job_id, session)
    file_path = INPUT_DIR / job.filename_input_saved

    return return_csv_file(
        file_path=file_path,
        filename=job.filename_input_saved,
        not_found_message="Input file not found.",
    )


@router.get("/{job_id}/download/clean")
def download_cleaned_file(
    job_id: int,
    session: Session = Depends(get_session),
) -> FileResponse:
    job = get_job_or_404(job_id, session)
    file_path = OUTPUT_DIR / job.filename_cleaned

    return return_csv_file(
        file_path=file_path,
        filename=job.filename_cleaned,
        not_found_message="Cleaned file not found.",
    )


@router.get("/{job_id}/download/errors")
def download_error_file(
    job_id: int,
    session: Session = Depends(get_session),
) -> FileResponse:
    job = get_job_or_404(job_id, session)
    file_path = OUTPUT_DIR / job.filename_error_report

    return return_csv_file(
        file_path=file_path,
        filename=job.filename_error_report,
        not_found_message="Error report file not found.",
    )