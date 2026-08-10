"""create discussion_messages table

Revision ID: g1h2i3j4k5l6
Revises: a6df7f842838
Create Date: 2026-04-04 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "g1h2i3j4k5l6"
down_revision: Union[str, None] = "a6df7f842838"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "discussion_messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "course_id",
            sa.Uuid(),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("role", sa.String(20), nullable=False, server_default="learner"),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "reply_to_id",
            sa.Uuid(),
            sa.ForeignKey("discussion_messages.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    # Composite index for efficient pagination: course + newest first
    op.create_index(
        "ix_discussion_messages_course_created",
        "discussion_messages",
        ["course_id", sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_discussion_messages_course_created")
    op.drop_table("discussion_messages")
