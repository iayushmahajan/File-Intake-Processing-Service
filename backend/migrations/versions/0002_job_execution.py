"""Persist dispatch intent and fenced worker attempts without altering history."""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "job_executions",
        sa.Column(
            "job_id",
            sa.Integer(),
            sa.ForeignKey("processing_jobs.id"),
            primary_key=True,
        ),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("publish_failures", sa.Integer(), nullable=False),
        sa.Column("claim_token", sa.String(), nullable=True),
        sa.Column("lease_expires_at", sa.DateTime(), nullable=True),
        sa.Column("next_dispatch_at", sa.DateTime(), nullable=False),
        sa.Column("waiting_since", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_execution_next_dispatch", "job_executions", ["next_dispatch_at"]
    )
    # Older interrupted synchronous jobs have no dispatch record. Do not guess
    # whether it is safe to rerun them or silently leave them active forever.
    op.execute(
        sa.text(
            "UPDATE processing_jobs SET status='failed', error_message='Processing was interrupted before the asynchronous upgrade. Upload the file again.' WHERE status IN ('pending', 'processing')"
        )
    )


def downgrade():
    raise RuntimeError("Destructive downgrade is disabled; restore a reviewed backup.")
