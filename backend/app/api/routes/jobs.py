from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import func, or_
from sqlmodel import Session, desc, select

from app.core.config import INPUT_DIR, OUTPUT_DIR
from app.core.db import get_session
from app.models.processing_job import JobAnalysis, JobExecution, ProcessingJob
from app.schemas.ai import AIAnalysisResponse
from app.schemas.job import JobDetailResponse, JobListResponse
from app.services.llm_analyzer import generate_ai_analysis

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


def get_job_or_404(job_id: int, session: Session) -> ProcessingJob:
    job = session.get(ProcessingJob, job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    return job


def return_csv_file(
    file_path: Path, filename: str, not_found_message: str
) -> FileResponse:
    resolved = file_path.resolve()
    if not any(
        resolved.is_relative_to(root.resolve()) for root in (INPUT_DIR, OUTPUT_DIR)
    ):
        raise HTTPException(status_code=404, detail=not_found_message)
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail=not_found_message)

    return FileResponse(
        path=file_path,
        filename=Path(filename).name,
        media_type="text/csv",
    )


def build_llm_summary(job: ProcessingJob) -> dict[str, Any]:
    # Never send row values, filenames, identifiers, emails, or arbitrary text.
    return {
        "total_rows": job.total_rows,
        "valid_rows": job.valid_rows,
        "invalid_rows": job.invalid_rows,
        "status": job.status,
    }


@router.get("", response_model=JobListResponse)
def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=200),
    status: Literal["pending", "queued", "processing", "completed", "failed"]
    | None = None,
    session: Session = Depends(get_session),
):
    filters = []
    if search.strip():
        term = search.strip()
        match = ProcessingJob.filename_original.icontains(term, autoescape=True)
        if (
            term.isascii()
            and term.isdecimal()
            and len(term) <= 10
            and int(term) <= 2147483647
        ):
            match = or_(match, ProcessingJob.id == int(term))
        filters.append(match)
    if status:
        filters.append(ProcessingJob.status == status)
    total = session.exec(
        select(func.count()).select_from(ProcessingJob).where(*filters)
    ).one()
    jobs = session.exec(
        select(ProcessingJob)
        .where(*filters)
        .order_by(desc(ProcessingJob.created_at), desc(ProcessingJob.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return JobListResponse(jobs=jobs, total=total, page=page, page_size=page_size)


@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job(job_id: int, session: Session = Depends(get_session)):
    job = get_job_or_404(job_id, session)
    metrics = session.get(JobAnalysis, job_id)
    extra = metrics.model_dump(exclude={"job_id"}) if metrics else {}
    execution = session.get(JobExecution, job_id)
    return JobDetailResponse(
        **job.model_dump(), attempts=execution.attempts if execution else 0, **extra
    )


@router.post("/{job_id}/ai-analysis", response_model=AIAnalysisResponse)
def generate_job_ai_analysis(
    job_id: int,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    job = get_job_or_404(job_id, session)
    if job.status != "completed":
        raise HTTPException(409, "AI analysis requires a completed job.")
    summary = build_llm_summary(job)

    metrics = session.get(JobAnalysis, job_id)
    if metrics and metrics.ai_report:
        return {"report": metrics.ai_report}
    if metrics:
        summary["error_breakdown"] = metrics.error_breakdown
        summary["quality"] = metrics.analysis.get("quality")
        summary["numeric_profiles"] = metrics.analysis.get("profiling", {}).get(
            "numeric", {}
        )
    result = generate_ai_analysis(summary)
    if result.get("report"):
        if metrics is None:
            metrics = JobAnalysis(job_id=job_id)
        metrics.ai_report = result["report"]
        session.add(metrics)
        session.commit()
    return result


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
