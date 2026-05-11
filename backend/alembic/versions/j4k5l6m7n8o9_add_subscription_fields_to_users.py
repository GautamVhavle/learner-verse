"""add_subscription_fields_to_users

Adds Razorpay Subscription fields for auto-renewing Pro subscriptions:
  - users.razorpay_subscription_id
  - users.razorpay_customer_id
  - users.subscription_status

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-05-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "j4k5l6m7n8o9"
down_revision = "i3j4k5l6m7n8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("razorpay_subscription_id", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("razorpay_customer_id", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("subscription_status", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "subscription_status")
    op.drop_column("users", "razorpay_customer_id")
    op.drop_column("users", "razorpay_subscription_id")
