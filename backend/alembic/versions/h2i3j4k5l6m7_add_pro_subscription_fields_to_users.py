"""add_pro_subscription_fields_to_users

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-04-05 18:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "h2i3j4k5l6m7"
down_revision: Union[str, None] = "g1h2i3j4k5l6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_pro",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "users",
        sa.Column("pro_since", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("pro_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("pro_plan", sa.String(20), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("razorpay_payment_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("razorpay_order_id", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "razorpay_order_id")
    op.drop_column("users", "razorpay_payment_id")
    op.drop_column("users", "pro_plan")
    op.drop_column("users", "pro_expires_at")
    op.drop_column("users", "pro_since")
    op.drop_column("users", "is_pro")
