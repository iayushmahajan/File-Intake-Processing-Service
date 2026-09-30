import csv
from datetime import datetime
from time import perf_counter

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session

from app.core.db import get_session
from app.core.logging import get_logger
from app.models.processing_job import JobAnalysis, ProcessingJob
from app.schemas.job import UploadResponse
from app.services.csv_processor import build_output_paths, process_csv_file
from app.utils.file_io import save_upload_file

router = APIRouter(prefix="/api/v1/uploads", tags=["uploads"])
logger = get_logger(__name__)


@router.post("", response_model=UploadResponse)
def upload_csv(file: UploadFile = File(...), session: Session = Depends(get_session)):
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
    session.add(job)
    session.commit()
    session.refresh(job)
    started = perf_counter()
    job.status = "processing"
    session.add(job)
    session.commit()
    try:
        result = process_csv_file(saved_path)
        job.status = result["status"]
        job.error_message = result["error_message"]
        job.filename_cleaned = result["cleaned_filename"]
        job.filename_error_report = result["error_filename"]
        job.total_rows = result["total_rows"]
        job.valid_rows = result["valid_rows"]
        job.invalid_rows = result["invalid_rows"]
    except Exception as error:
        logger.exception("CSV processing failed", extra={"job_id": job.id})
        _, clean_path, _, error_path = build_output_paths(saved_path)
        clean_path.unlink(missing_ok=True)
        error_path.unlink(missing_ok=True)
        job.status = "failed"
        job.error_message = (
            "The file must be valid UTF-8 CSV with correctly quoted fields."
            if isinstance(error, (UnicodeError, csv.Error))
            else "Processing failed. Review the CSV format or contact the operator."
        )
        result = dict(
            total_rows=0,
            valid_rows=0,
            invalid_rows=0,
            cleaned_filename="",
            error_filename="",
            error_breakdown={},
            analysis={},
        )
    session.add(
        JobAnalysis(
            job_id=job.id,
            file_size=saved_path.stat().st_size,
            duration_ms=round((perf_counter() - started) * 1000),
            analysis=result["analysis"],
            error_breakdown=result["error_breakdown"],
        )
    )
    job.processed_at = datetime.utcnow()
    session.add(job)
    session.commit()
    session.refresh(job)
    return UploadResponse(
        status=job.status,
        error_message=job.error_message,
        message="File uploaded and processed successfully."
        if job.status == "completed"
        else "File processing failed.",
        original_filename=job.filename_original,
        saved_filename=saved_filename,
        processing_summary=result,
        job_id=job.id,
    )
