from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlmodel import Session

from app.core.db import get_session
from app.models.processing_job import JobAnalysis, JobExecution, ProcessingJob
from app.schemas.job import UploadResponse
from app.utils.file_io import save_upload_file

router = APIRouter(prefix="/api/v1/uploads", tags=["uploads"])


@router.post("", response_model=UploadResponse, status_code=202)
def upload_csv(
    response: Response,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    if not file.filename:
        raise HTTPException(400, "No file provided.")
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only CSV files are allowed.")
    saved_filename, saved_path = save_upload_file(file)
    job = ProcessingJob(
        filename_original=file.filename.replace("\\", "/").split("/")[-1],
        filename_input_saved=saved_filename,
        filename_cleaned="",
        filename_error_report="",
        status="pending",
    )
    committing = False
    try:
        session.add(job)
        session.flush()
        session.add(JobAnalysis(job_id=job.id, file_size=saved_path.stat().st_size))
        session.add(JobExecution(job_id=job.id))
        # One transaction records the job AND dispatch intent. The request never
        # waits for Redis or runs CSV processing, even when infrastructure is down.
        committing = True
        session.commit()
    except Exception:
        session.rollback()
        # A lost commit acknowledgement may still mean the job was persisted.
        # Keep the input in that case; an orphan is safer than a broken job.
        if not committing:
            saved_path.unlink(missing_ok=True)
        raise
    session.refresh(job)
    status_url = f"/api/v1/jobs/{job.id}"
    response.headers["Location"] = status_url
    return UploadResponse(
        status="pending",
        message="Upload accepted for background processing.",
        original_filename=job.filename_original,
        saved_filename=saved_filename,
        job_id=job.id,
        status_url=status_url,
    )
