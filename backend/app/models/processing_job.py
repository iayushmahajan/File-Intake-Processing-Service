from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class ProcessingJob(SQLModel, table=True):
    __tablename__ = "processing_jobs"

    id: Optional[int] = Field(default=None, primary_key=True)
    filename_original: str
    filename_input_saved: str
    filename_cleaned: str
    filename_error_report: str
    status: str = Field(default="completed")
    total_rows: int = Field(default=0)
    valid_rows: int = Field(default=0)
    invalid_rows: int = Field(default=0)
    error_message: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: datetime = Field(default_factory=datetime.utcnow)