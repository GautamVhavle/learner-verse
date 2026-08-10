"""create activity_log table

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-03-20

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activity_log",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("activity_date", sa.Date(), nullable=False),
        sa.Column("lessons_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("user_id", "activity_date", name="uq_activity_log_user_date"),
        sa.Index("ix_activity_log_user_date", "user_id", "activity_date"),
    )


def downgrade() -> None:
    op.drop_table("activity_log")
