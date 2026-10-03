"""Transport adapter only. Business orchestration owns its own DB sessions."""

from sqlalchemy.exc import InterfaceError, OperationalError

from app.core.celery_app import celery_app
from app.services.job_processing import process_job


@celery_app.task(name="intake.process_job", bind=True, max_retries=2)
def process_job_task(self, job_id):
    try:
        return process_job(job_id)
    except (OperationalError, InterfaceError) as error:
        # Covers transient DB connectivity. The outbox/lease also survives
        # exhaustion of transport retries or a lost worker process.
        raise self.retry(exc=error, countdown=2 ** (self.request.retries + 1))
