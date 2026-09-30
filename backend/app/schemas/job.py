from datetime import datetime
from typing import Literal, Optional

from app.schemas.ai import AIReport
from app.schemas.analysis import AnalysisResponse
from pydantic import BaseModel, ConfigDict, Field

JobStatus = Literal["pending", "processing", "completed", "failed"]


class ProcessingSummaryResponse(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    cleaned_filename: str
    error_filename: str
    error_breakdown: dict[str, int] = Field(default_factory=dict)
    analysis: AnalysisResponse = Field(default_factory=AnalysisResponse)


class UploadResponse(BaseModel):
    status: JobStatus
    error_message: Optional[str] = None
    message: str
    original_filename: str
    saved_filename: str
    processing_summary: ProcessingSummaryResponse
    job_id: int


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename_original: str
    filename_input_saved: str
    filename_cleaned: str
    filename_error_report: str
    status: JobStatus
    total_rows: int
    valid_rows: int
    invalid_rows: int
    error_message: Optional[str]
    created_at: datetime
    processed_at: datetime


class JobListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    jobs: list[JobResponse]
    total: int
    page: int
    page_size: int


class JobDetailResponse(JobResponse):
    file_size: int | None = None
    duration_ms: int | None = None
    analysis: AnalysisResponse | None = None
    error_breakdown: dict[str, int] = Field(default_factory=dict)
    ai_report: AIReport | None = None
