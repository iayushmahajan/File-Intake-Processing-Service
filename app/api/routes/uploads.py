from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session

from app.core.db import get_session
from app.core.logging import get_logger
from app.models.processing_job import ProcessingJob
from app.schemas.job import UploadResponse
from app.services.csv_processor import process_csv_file
from app.utils.file_io import save_upload_file

router = APIRouter(prefix="/api/v1/uploads", tags=["uploads"])
logger = get_logger(__name__)


@router.post("", response_model=UploadResponse)
def upload_csv(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> UploadResponse:
    if not file.filename:
        logger.warning("Upload rejected because no file name was provided")
        raise HTTPException(status_code=400, detail="No file provided.")

    if not file.filename.lower().endswith(".csv"):
        logger.warning(
            "Upload rejected because file is not CSV",
            extra={"upload_filename": file.filename},
        )
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

    logger.info(
        "Upload request accepted",
        extra={"upload_filename": file.filename},
    )

    saved_filename, saved_path = save_upload_file(file)
    processing_result = process_csv_file(saved_path)

    job = ProcessingJob(
        filename_original=file.filename,
        filename_input_saved=saved_filename,
        filename_cleaned=processing_result["cleaned_filename"],
        filename_error_report=processing_result["error_filename"],
        status="completed",
        total_rows=processing_result["total_rows"],
        valid_rows=processing_result["valid_rows"],
        invalid_rows=processing_result["invalid_rows"],
        error_message=None,
        processed_at=datetime.utcnow(),
    )

    session.add(job)
    session.commit()
    session.refresh(job)

    logger.info(
        "Processing job created",
        extra={
            "job_id": job.id,
            "original_filename": file.filename,
            "saved_filename": saved_filename,
            "total_rows": processing_result["total_rows"],
            "valid_rows": processing_result["valid_rows"],
            "invalid_rows": processing_result["invalid_rows"],
        },
    )

    return UploadResponse(
        message="File uploaded and processed successfully.",
        original_filename=file.filename,
        saved_filename=saved_filename,
        saved_path=str(saved_path),
        processing_summary=processing_result,
        job_id=job.id,
    )