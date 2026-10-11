from datetime import datetime

from sqlalchemy import JSON, Column, Index
from sqlmodel import Field, SQLModel


class ProcessingJob(SQLModel, table=True):
    __tablename__ = "processing_jobs"
    __table_args__ = (
        Index("ix_jobs_created_at", "created_at", "id"),
        Index("ix_jobs_status", "status"),
    )

    id: int | None = Field(default=None, primary_key=True)
    filename_original: str
    filename_input_saved: str
    filename_cleaned: str
    filename_error_report: str
    status: str = Field(default="pending")
    total_rows: int = Field(default=0)
    valid_rows: int = Field(default=0)
    invalid_rows: int = Field(default=0)
    error_message: str | None = Field(default=None)
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


class JobExecution(SQLModel, table=True):
    """Durable work intent and fenced execution lease; no Celery result backend."""

    __tablename__ = "job_executions"
    __table_args__ = (Index("ix_execution_next_dispatch", "next_dispatch_at"),)
    job_id: int = Field(primary_key=True, foreign_key="processing_jobs.id")
    attempts: int = 0
    publish_failures: int = 0
    claim_token: str | None = None
    lease_expires_at: datetime | None = None
    next_dispatch_at: datetime = Field(default_factory=datetime.utcnow)
    waiting_since: datetime = Field(default_factory=datetime.utcnow)


class ImportTemplate(SQLModel, table=True):
    __tablename__ = "import_templates"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    version: int = 1
    options: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class JobImport(SQLModel, table=True):
    __tablename__ = "job_imports"
    job_id: int = Field(primary_key=True, foreign_key="processing_jobs.id")
    parent_job_id: int | None = Field(
        default=None, foreign_key="processing_jobs.id", index=True
    )
    options: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    corrections: dict = Field(
        default_factory=dict, sa_column=Column(JSON, nullable=False)
    )
    changes: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    records_available: bool = False


class JobRecord(SQLModel, table=True):
    __tablename__ = "job_records"
    __table_args__ = (
        Index("ix_records_job_status_row", "job_id", "status", "row_number"),
    )
    job_id: int = Field(primary_key=True, foreign_key="processing_jobs.id")
    row_number: int = Field(primary_key=True)
    status: str
    values: dict = Field(sa_column=Column(JSON, nullable=False))
    normalized: dict = Field(
        default_factory=dict, sa_column=Column(JSON, nullable=False)
    )
    issues: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    categories: str = ""
    search_text: str = ""
