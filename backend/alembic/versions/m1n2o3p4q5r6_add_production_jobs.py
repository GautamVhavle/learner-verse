"""add durable production projects, jobs, and transactional outbox

Revision ID: m1n2o3p4q5r6
Revises: l6m7n8o9p0q1
Create Date: 2026-08-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "m1n2o3p4q5r6"
down_revision = "l6m7n8o9p0q1"
branch_labels = None
depends_on = None


def _uuid() -> sa.Uuid:
    return sa.Uuid(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "production_projects",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("user_id", _uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_id", _uuid(), sa.ForeignKey("courses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("state", sa.String(40), nullable=False, server_default="draft"),
        sa.Column("active_spec_version_id", _uuid(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_production_projects_user_id", "production_projects", ["user_id"])

    op.create_table(
        "production_spec_versions",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("project_id", _uuid(), sa.ForeignKey("production_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", _uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("schema_version", sa.String(20), nullable=False),
        sa.Column("document", sa.JSON(), nullable=False),
        sa.Column("checksum", sa.String(64), nullable=False),
        sa.Column("validation_report", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", "version", name="uq_production_spec_project_version"),
        sa.UniqueConstraint("project_id", "checksum", name="uq_production_spec_project_checksum"),
    )
    op.create_index("idx_production_spec_versions_project_id", "production_spec_versions", ["project_id"])

    op.create_table(
        "production_runs",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("project_id", _uuid(), sa.ForeignKey("production_projects.id", ondelete="CASCADE"), nullable=True),
        sa.Column("spec_version_id", _uuid(), sa.ForeignKey("production_spec_versions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", _uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_type", sa.String(100), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("stage", sa.String(100), nullable=False, server_default="queued"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cancel_requested", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("retryable", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("failure_code", sa.String(100), nullable=True),
        sa.Column("failure_message", sa.Text(), nullable=True),
        sa.Column("correlation_id", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('queued','running','retrying','completed','failed','cancelled')", name="ck_production_runs_status"),
    )
    op.create_index("idx_production_runs_user_status", "production_runs", ["user_id", "status"])
    op.create_index("idx_production_runs_scheduled_at", "production_runs", ["status", "scheduled_at"])

    op.create_table(
        "job_events",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("run_id", _uuid(), sa.ForeignKey("production_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", _uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("stage", sa.String(100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_job_events_run_id_created_at", "job_events", ["run_id", "created_at"])

    op.create_table(
        "job_attempts",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("run_id", _uuid(), sa.ForeignKey("production_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("worker_id", sa.String(100), nullable=False),
        sa.Column("lease_token", sa.String(64), nullable=False, unique=True),
        sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("outcome", sa.String(20), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.UniqueConstraint("run_id", "attempt_number", name="uq_job_attempt_run_number"),
    )
    op.create_index("idx_job_attempts_run_id", "job_attempts", ["run_id"])
    op.create_index("idx_job_attempts_lease_expires_at", "job_attempts", ["lease_expires_at"])

    op.create_table(
        "idempotency_records",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("user_id", _uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("operation", sa.String(100), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("request_checksum", sa.String(64), nullable=False),
        sa.Column("response", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "operation", "idempotency_key", name="uq_idempotency_owner_operation_key"),
    )

    op.create_table(
        "usage_ledger",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("user_id", _uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("run_id", _uuid(), sa.ForeignKey("production_runs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("kind", sa.String(100), nullable=False),
        sa.Column("units", sa.Numeric(18, 6), nullable=False),
        sa.Column("estimated_cost", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("actual_cost", sa.Numeric(18, 6), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_usage_ledger_user_created_at", "usage_ledger", ["user_id", "created_at"])

    op.create_table(
        "outbox_messages",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("run_id", _uuid(), sa.ForeignKey("production_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", _uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message_type", sa.String(100), nullable=False, server_default="run_job"),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("dispatch_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('pending','processing','dispatched','failed')", name="ck_outbox_status"),
        sa.UniqueConstraint("run_id", "message_type", name="uq_outbox_run_message_type"),
    )
    op.create_index("idx_outbox_status_available", "outbox_messages", ["status", "available_at"])


def downgrade() -> None:
    op.drop_index("idx_outbox_status_available", table_name="outbox_messages")
    op.drop_table("outbox_messages")
    op.drop_index("idx_usage_ledger_user_created_at", table_name="usage_ledger")
    op.drop_table("usage_ledger")
    op.drop_table("idempotency_records")
    op.drop_index("idx_job_attempts_lease_expires_at", table_name="job_attempts")
    op.drop_index("idx_job_attempts_run_id", table_name="job_attempts")
    op.drop_table("job_attempts")
    op.drop_index("idx_job_events_run_id_created_at", table_name="job_events")
    op.drop_table("job_events")
    op.drop_index("idx_production_runs_scheduled_at", table_name="production_runs")
    op.drop_index("idx_production_runs_user_status", table_name="production_runs")
    op.drop_table("production_runs")
    op.drop_index("idx_production_spec_versions_project_id", table_name="production_spec_versions")
    op.drop_table("production_spec_versions")
    op.drop_index("idx_production_projects_user_id", table_name="production_projects")
    op.drop_table("production_projects")
