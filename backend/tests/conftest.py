from sqlmodel import SQLModel
from app.core.db import engine


def setup_function():
    SQLModel.metadata.create_all(engine)


def teardown_function():
    SQLModel.metadata.drop_all(engine)