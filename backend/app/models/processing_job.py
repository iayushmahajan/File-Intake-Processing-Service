from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Column, Index
from sqlmodel import Field, SQLModel


class ProcessingJob(SQLModel, table=True):
    __tablename__ = "processing_jobs"
    __table_args__ = (
        Index("ix_jobs_created_at", "created_at", "id"),
        Index("ix_jobs_status", "status"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    filename_original: str
    filename_input_saved: str
    filename_cleaned: str
    filename_error_report: str
    status: str = Field(default="pending")
    total_rows: int = Field(default=0)
    valid_rows: int = Field(default=0)
    invalid_rows: int = Field(default=0)
    error_message: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: datetime = Field(default_factory=datetime.utcnow)


class JobAnalysis(SQLModel, table=True):
    """Additive table: historical job rows remain intact and readable."""

    __tablename__ = "job_analyses"
    job_id: int = Field(primary_key=True, foreign_key="processing_jobs.id")
    file_size: int = 0
    duration_ms: int = 0
    analysis: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    error_breakdown: dict = Field(
        default_factory=dict, sa_column=Column(JSON, nullable=False)
    )
    ai_report: dict | None = Field(default=None, sa_column=Column(JSON, nullable=True))
