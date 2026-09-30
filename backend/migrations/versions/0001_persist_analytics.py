"""Adopt existing job history and add persisted analytics without replacing rows."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "processing_jobs" not in tables:
        op.create_table(
            "processing_jobs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("filename_original", sa.String(), nullable=False),
            sa.Column("filename_input_saved", sa.String(), nullable=False),
            sa.Column("filename_cleaned", sa.String(), nullable=False),
            sa.Column("filename_error_report", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("total_rows", sa.Integer(), nullable=False),
            sa.Column("valid_rows", sa.Integer(), nullable=False),
            sa.Column("invalid_rows", sa.Integer(), nullable=False),
            sa.Column("error_message", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("processed_at", sa.DateTime(), nullable=False),
        )
    if "job_analyses" not in tables:
        op.create_table(
            "job_analyses",
            sa.Column(
                "job_id",
                sa.Integer(),
                sa.ForeignKey("processing_jobs.id"),
                primary_key=True,
            ),
            sa.Column("file_size", sa.Integer(), nullable=False),
            sa.Column("duration_ms", sa.Integer(), nullable=False),
            sa.Column("analysis", sa.JSON(), nullable=False),
            sa.Column("error_breakdown", sa.JSON(), nullable=False),
            sa.Column("ai_report", sa.JSON(), nullable=True),
        )
    indexes = {
        index["name"]
        for index in sa.inspect(op.get_bind()).get_indexes("processing_jobs")
    }
    if "ix_jobs_created_at" not in indexes:
        op.create_index("ix_jobs_created_at", "processing_jobs", ["created_at", "id"])
    if "ix_jobs_status" not in indexes:
        op.create_index("ix_jobs_status", "processing_jobs", ["status"])


def downgrade():
    raise RuntimeError(
        "Destructive downgrade is disabled. Restore a reviewed database backup instead."
    )
