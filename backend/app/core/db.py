from collections.abc import Generator
from pathlib import Path

from alembic import command
from alembic.config import Config
from app.core.config import DATABASE_URL
from sqlmodel import Session, create_engine

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {},
)


def migrate_database() -> None:
    config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
