"""Configure isolation BEFORE importing any application module."""

import os
from tempfile import TemporaryDirectory

_test_workspace = TemporaryDirectory(prefix="file-intake-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{_test_workspace.name}/tests.db"
os.environ["DATA_DIR"] = f"{_test_workspace.name}/data"
os.environ["OPENAI_API_KEY"] = ""

import pytest
from app.core.db import engine
from app.models.processing_job import ProcessingJob  # noqa: F401
from sqlmodel import SQLModel


@pytest.fixture(autouse=True)
def reset_test_database():
    assert str(engine.url).startswith(f"sqlite:///{_test_workspace.name}/")
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)
