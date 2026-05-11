"""add category to courses

Revision ID: l6m7n8o9p0q1
Revises: k5l6m7n8o9p0
Create Date: 2026-05-12

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "l6m7n8o9p0q1"
down_revision: Union[str, None] = "k5l6m7n8o9p0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column("category", sa.String(30), nullable=False, server_default="other"),
    )
    op.create_index("idx_courses_category", "courses", ["category"])


def downgrade() -> None:
    op.drop_index("idx_courses_category", table_name="courses")
    op.drop_column("courses", "category")
