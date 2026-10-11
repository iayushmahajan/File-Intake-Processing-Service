"""Add record explorer, immutable job configuration and versioned templates."""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "import_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "job_imports",
        sa.Column(
            "job_id",
            sa.Integer(),
            sa.ForeignKey("processing_jobs.id"),
            primary_key=True,
        ),
        sa.Column("parent_job_id", sa.Integer(), sa.ForeignKey("processing_jobs.id")),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("corrections", sa.JSON(), nullable=False),
        sa.Column("changes", sa.JSON(), nullable=False),
        sa.Column("records_available", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_job_imports_parent_job_id", "job_imports", ["parent_job_id"])
    op.create_table(
        "job_records",
        sa.Column(
            "job_id",
            sa.Integer(),
            sa.ForeignKey("processing_jobs.id"),
            primary_key=True,
        ),
        sa.Column("row_number", sa.Integer(), primary_key=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("values", sa.JSON(), nullable=False),
        sa.Column("normalized", sa.JSON(), nullable=False),
        sa.Column("issues", sa.JSON(), nullable=False),
        sa.Column("categories", sa.String(), nullable=False),
        sa.Column("search_text", sa.String(), nullable=False),
    )
    op.create_index(
        "ix_records_job_status_row", "job_records", ["job_id", "status", "row_number"]
    )


def downgrade():
    raise RuntimeError("Destructive downgrade is disabled; restore a reviewed backup.")
