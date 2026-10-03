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


def test_async_migration_preserves_analytics_and_marks_legacy_interruption(tmp_path):
    from app.models.processing_job import JobAnalysis
    from sqlmodel import Session

    engine = create_engine(f"sqlite:///{tmp_path}/upgrade.db")
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "0001")
    with Session(engine) as session:
        for job_id, status in [(1, "completed"), (2, "processing")]:
            session.add(
                ProcessingJob(
                    id=job_id,
                    filename_original="legacy.csv",
                    filename_input_saved="input.csv",
                    filename_cleaned="",
                    filename_error_report="",
                    status=status,
                )
            )
        session.add(
            JobAnalysis(
                job_id=1,
                analysis={"quality": {"score": 88}},
                ai_report={"executive_summary": "Saved legacy report"},
            )
        )
        session.commit()
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    with Session(engine) as session:
        assert session.get(ProcessingJob, 1).status == "completed"
        assert session.get(JobAnalysis, 1).analysis["quality"]["score"] == 88
        assert (
            session.get(JobAnalysis, 1).ai_report["executive_summary"]
            == "Saved legacy report"
        )
        assert session.get(ProcessingJob, 2).status == "failed"
