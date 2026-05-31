"""add_onboarding_complete_to_users

Revision ID: cf0df0aa5064
Revises: e4f5a6b7c8d9
Create Date: 2026-03-20 21:37:23.770659

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "cf0df0aa5064"
down_revision: Union[str, None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "onboarding_complete", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "onboarding_complete")
