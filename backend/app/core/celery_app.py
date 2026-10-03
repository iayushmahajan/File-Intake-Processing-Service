from app.core.config import (
    CELERY_BROKER_URL,
    CELERY_QUEUE,
    JOB_LEASE_SECONDS,
    JOB_TIME_LIMIT_SECONDS,
)
from celery import Celery
from celery.signals import worker_process_init

celery_app = Celery("file_intake", broker=CELERY_BROKER_URL, include=["app.tasks"])
celery_app.conf.update(
    task_default_queue=CELERY_QUEUE,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_ignore_result=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_time_limit=JOB_TIME_LIMIT_SECONDS,
    task_soft_time_limit=JOB_TIME_LIMIT_SECONDS - 2,
    broker_connection_retry_on_startup=True,
    broker_connection_timeout=3,
    broker_transport_options={
        "visibility_timeout": JOB_LEASE_SECONDS + 30,
        "socket_connect_timeout": 3,
        "socket_timeout": 3,
        "retry_on_timeout": False,
        "max_retries": 0,
    },
    task_publish_retry=False,
)


@worker_process_init.connect
def dispose_inherited_connections(**kwargs):
    from app.core.db import engine

    engine.dispose(close=False)
