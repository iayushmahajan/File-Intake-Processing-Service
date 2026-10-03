"""Configure isolation BEFORE importing any application module."""

import os
from tempfile import TemporaryDirectory

_test_workspace = TemporaryDirectory(prefix="file-intake-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{_test_workspace.name}/tests.db"
os.environ["DATA_DIR"] = f"{_test_workspace.name}/data"
os.environ["OPENAI_API_KEY"] = ""
# Unit/API tests explicitly invoke tasks; never publish into a developer broker.
for key, value in {
    "CELERY_BROKER_URL": "memory://",
    "CELERY_QUEUE": "unit-tests",
    "JOB_TIME_LIMIT_SECONDS": "120",
    "JOB_LEASE_SECONDS": "150",
    "JOB_MAX_ATTEMPTS": "3",
    "JOB_REDISPATCH_SECONDS": "30",
    "JOB_QUEUE_TIMEOUT_SECONDS": "600",
    "PUBLISH_MAX_FAILURES": "8",
    "DISPATCH_INTERVAL_SECONDS": "2",
}.items():
    os.environ[key] = value

import pytest
from app.core.db import engine, migrate_database
from app.models.processing_job import ProcessingJob  # noqa: F401
from sqlalchemy import text
from sqlmodel import SQLModel


@pytest.fixture(autouse=True)
def reset_test_database():
    assert str(engine.url).startswith(f"sqlite:///{_test_workspace.name}/")
    SQLModel.metadata.drop_all(engine)
    with engine.begin() as connection:
        connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
    migrate_database()
    yield
    SQLModel.metadata.drop_all(engine)
