from pathlib import Path

from alembic import command
from alembic.config import Config
from app.models.processing_job import ProcessingJob
from sqlalchemy import create_engine, inspect, text


def test_adoption_migration_preserves_existing_history(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path}/legacy.db")
    ProcessingJob.__table__.create(engine)
    with engine.begin() as connection:
        connection.execute(
            text("""INSERT INTO processing_jobs
            (id, filename_original, filename_input_saved, filename_cleaned, filename_error_report,
             status, total_rows, valid_rows, invalid_rows, created_at, processed_at)
            VALUES (42, 'legacy.csv', 'legacy.csv', 'clean.csv', 'errors.csv', 'completed', 3, 2, 1,
                    '2026-01-01', '2026-01-01')""")
        )
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
        command.upgrade(config, "head")
        assert (
            connection.execute(
                text("SELECT total_rows FROM processing_jobs WHERE id=42")
            ).scalar()
            == 3
        )
        assert "job_analyses" in inspect(connection).get_table_names()
