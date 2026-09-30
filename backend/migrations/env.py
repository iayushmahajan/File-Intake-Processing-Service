from alembic import context
from app.core.config import DATABASE_URL
from app.models.processing_job import JobAnalysis, ProcessingJob  # noqa: F401
from sqlalchemy import create_engine, pool
from sqlmodel import SQLModel

config = context.config


def migrate(connection):
    context.configure(connection=connection, target_metadata=SQLModel.metadata)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    raise RuntimeError("This adoption migration requires a database connection.")
elif config.attributes.get("connection") is not None:
    migrate(config.attributes["connection"])
else:
    engine = create_engine(DATABASE_URL, poolclass=pool.NullPool)
    with engine.connect() as connection:
        migrate(connection)
