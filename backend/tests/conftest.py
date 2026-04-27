import pytest
from sqlmodel import SQLModel

from app.core.db import engine
from app.models.processing_job import ProcessingJob  # noqa: F401


@pytest.fixture(autouse=True)
def reset_test_database():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

    yield

    SQLModel.metadata.drop_all(engine)