"""add lesson_type column

Revision ID: a6b7c8d9e0f1
Revises: f5a6b7c8d9e0
Create Date: 2026-03-21
"""

from typing import Union

from alembic import op
import sqlalchemy as sa

revision: str = "a6b7c8d9e0f1"
down_revision: Union[str, None] = "f5a6b7c8d9e0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lessons",
        sa.Column(
            "lesson_type",
            sa.String(10),
            nullable=False,
            server_default="video",
        ),
    )


def downgrade() -> None:
    op.drop_column("lessons", "lesson_type")
