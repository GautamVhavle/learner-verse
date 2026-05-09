"""add_verified_creator_and_verification_requests

Adds:
  - users.is_verified_creator (bool, default False)
  - users.verified_at (timestamptz, nullable)
  - verification_requests table for creator badge applications

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-05-10 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "i3j4k5l6m7n8"
down_revision: Union[str, None] = "h2i3j4k5l6m7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Add verified creator columns to users ─────────────────────────
    op.add_column(
        "users",
        sa.Column("is_verified_creator", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "users",
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── Create verification_requests table ───────────────────────────
    op.create_table(
        "verification_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "idx_verification_requests_user_id",
        "verification_requests",
        ["user_id"],
    )
    op.create_index(
        "idx_verification_requests_status",
        "verification_requests",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("idx_verification_requests_status", table_name="verification_requests")
    op.drop_index("idx_verification_requests_user_id", table_name="verification_requests")
    op.drop_table("verification_requests")
    op.drop_column("users", "verified_at")
    op.drop_column("users", "is_verified_creator")
