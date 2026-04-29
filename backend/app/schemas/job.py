from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ProcessingSummaryResponse(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    cleaned_filename: str
    error_filename: str
    cleaned_path: str
    error_path: str
    error_breakdown: dict[str, int] = {}


class UploadResponse(BaseModel):
    message: str
    original_filename: str
    saved_filename: str
    saved_path: str
    processing_summary: ProcessingSummaryResponse
    job_id: int


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename_original: str
    filename_input_saved: str
    filename_cleaned: str
    filename_error_report: str
    status: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    error_message: Optional[str]
    created_at: datetime
    processed_at: datetime


class JobListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    jobs: list[JobResponse]