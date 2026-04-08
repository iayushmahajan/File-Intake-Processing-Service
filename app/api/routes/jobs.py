from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, desc, select

from app.core.config import OUTPUT_DIR
from app.core.db import get_session
from app.models.processing_job import ProcessingJob
from app.schemas.job import JobListResponse, JobResponse

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


@router.get("", response_model=JobListResponse)
def list_jobs(session: Session = Depends(get_session)) -> JobListResponse:
    statement = select(ProcessingJob).order_by(desc(ProcessingJob.created_at))
    jobs = session.exec(statement).all()
    return JobListResponse(jobs=jobs)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, session: Session = Depends(get_session)) -> JobResponse:
    job = session.get(ProcessingJob, job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    return job


@router.get("/{job_id}/download/clean")
def download_cleaned_file(
    job_id: int,
    session: Session = Depends(get_session),
) -> FileResponse:
    job = session.get(ProcessingJob, job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    file_path = OUTPUT_DIR / job.filename_cleaned

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Cleaned file not found.")

    return FileResponse(
        path=file_path,
        filename=job.filename_cleaned,
        media_type="text/csv",
    )


@router.get("/{job_id}/download/errors")
def download_error_file(
    job_id: int,
    session: Session = Depends(get_session),
) -> FileResponse:
    job = session.get(ProcessingJob, job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    file_path = OUTPUT_DIR / job.filename_error_report

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Error report file not found.")

    return FileResponse(
        path=file_path,
        filename=job.filename_error_report,
        media_type="text/csv",
    )