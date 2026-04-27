from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, desc, select

from app.core.config import INPUT_DIR, OUTPUT_DIR
from app.core.db import get_session
from app.models.processing_job import ProcessingJob
from app.schemas.job import JobListResponse, JobResponse

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


@router.get("", response_model=JobListResponse)
def list_jobs(session: Session = Depends(get_session)) -> JobListResponse:
    statement = select(ProcessingJob).order_by(desc(ProcessingJob.created_at))
    jobs = session.exec(statement).all()

    return JobListResponse(jobs=jobs)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, session: Session = Depends(get_session)) -> JobResponse:
    return get_job_or_404(job_id, session)


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