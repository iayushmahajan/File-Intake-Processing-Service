"""Database-backed outbox delivery and expired-lease recovery.

One small dispatcher is sufficient locally; duplicate publishers are safe because
work is claimed atomically and results are fenced by an attempt token.
"""

from collections.abc import Callable
from datetime import datetime, timedelta

from app.core.config import (
    JOB_MAX_ATTEMPTS,
    JOB_QUEUE_TIMEOUT_SECONDS,
    JOB_REDISPATCH_SECONDS,
    PUBLISH_MAX_FAILURES,
)
from app.core.db import engine
from app.core.logging import get_logger
from app.models.processing_job import JobExecution, ProcessingJob
from sqlalchemy import update
from sqlmodel import Session, select

logger = get_logger(__name__)


def publish_job(job_id: int) -> None:
    from app.tasks import process_job_task

    process_job_task.apply_async(args=[job_id], retry=False)


def recover_expired(now: datetime) -> int:
    with Session(engine) as session:
        ids = session.exec(
            select(JobExecution.job_id)
            .where(
                JobExecution.claim_token.is_not(None),
                JobExecution.lease_expires_at <= now,
            )
            .limit(100)
        ).all()
    recovered = 0
    for job_id in ids:
        with Session(engine) as session:
            updated = session.exec(
                update(JobExecution)
                .where(
                    JobExecution.job_id == job_id,
                    JobExecution.claim_token.is_not(None),
                    JobExecution.lease_expires_at <= now,
                )
                .values(
                    claim_token=None,
                    lease_expires_at=None,
                    next_dispatch_at=now,
                    waiting_since=now,
                )
            )
            if not updated.rowcount:
                continue
            execution = session.get(JobExecution, job_id)
            job = session.get(ProcessingJob, job_id)
            if job.status != "processing":
                session.rollback()
                continue
            exhausted = execution.attempts >= JOB_MAX_ATTEMPTS
            job.status = "failed" if exhausted else "pending"
            job.error_message = (
                "Worker execution expired and exhausted the retry limit."
                if exhausted
                else "Worker execution was interrupted; retrying automatically."
            )
            if exhausted:
                job.processed_at = now
            session.add(job)
            session.commit()
            recovered += 1
    return recovered


def _reserve(job_id: int, now: datetime) -> datetime | None:
    reserved_until = now + timedelta(seconds=JOB_REDISPATCH_SECONDS)
    with Session(engine) as session:
        updated = session.exec(
            update(JobExecution)
            .where(
                JobExecution.job_id == job_id,
                JobExecution.claim_token.is_(None),
                JobExecution.next_dispatch_at <= now,
            )
            .values(next_dispatch_at=reserved_until)
        )
        if not updated.rowcount:
            return None
        job = session.get(ProcessingJob, job_id)
        execution = session.get(JobExecution, job_id)
        if job.status not in {"pending", "queued"}:
            session.rollback()
            return None
        if (now - execution.waiting_since).total_seconds() >= JOB_QUEUE_TIMEOUT_SECONDS:
            job.status = "failed"
            job.error_message = "No worker started this job before the queue timeout. Check worker and Redis health, then upload again."
            job.processed_at = now
            session.add(job)
            session.commit()
            return None
        session.commit()
    return reserved_until


def _record_publication(
    job_id: int, reservation: datetime, success: bool, now: datetime
):
    with Session(engine) as session:
        locked = session.exec(
            update(JobExecution)
            .where(
                JobExecution.job_id == job_id,
                JobExecution.claim_token.is_(None),
                JobExecution.next_dispatch_at == reservation,
            )
            .values(publish_failures=JobExecution.publish_failures)
        )
        if not locked.rowcount:
            return  # Worker already claimed it, or another dispatch superseded us.
        execution = session.get(JobExecution, job_id)
        job = session.get(ProcessingJob, job_id)
        if job.status not in {"pending", "queued"}:
            session.rollback()
            return
        if success:
            execution.publish_failures = 0
            job.status = "queued"
            job.error_message = None
        else:
            execution.publish_failures += 1
            execution.next_dispatch_at = now + timedelta(
                seconds=min(30, 2**execution.publish_failures)
            )
            exhausted = execution.publish_failures >= PUBLISH_MAX_FAILURES
            job.status = "failed" if exhausted else "pending"
            job.error_message = (
                "Queue publication failed after bounded retries. Check Redis and upload again."
                if exhausted
                else "Queue unavailable; dispatch will retry automatically."
            )
            if exhausted:
                job.processed_at = now
        session.add_all([job, execution])
        session.commit()


def dispatch_once(
    publish: Callable[[int], None] = publish_job, now: datetime | None = None
) -> int:
    now = now or datetime.utcnow()
    recover_expired(now)
    with Session(engine) as session:
        ids = session.exec(
            select(JobExecution.job_id)
            .join(ProcessingJob)
            .where(
                ProcessingJob.status.in_(["pending", "queued"]),
                JobExecution.claim_token.is_(None),
                JobExecution.next_dispatch_at <= now,
            )
            .order_by(JobExecution.next_dispatch_at)
            .limit(10)
        ).all()
    delivered = 0
    for job_id in ids:
        reservation = _reserve(job_id, now)
        if reservation is None:
            continue
        try:
            publish(job_id)
        except Exception:
            logger.warning("Queue publication failed", extra={"job_id": job_id})
            _record_publication(job_id, reservation, False, now)
        else:
            _record_publication(job_id, reservation, True, now)
            delivered += 1
    return delivered
