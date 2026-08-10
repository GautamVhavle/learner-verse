"""Restore database-enforced certificate idempotency.

Revision ID: p4q5r6s7t8u9
Revises: o3p4q5r6s7t8
"""

from alembic import op

revision = "p4q5r6s7t8u9"
down_revision = "o3p4q5r6s7t8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # A historical quiz migration accidentally dropped this constraint. Keep
    # the oldest certificate if concurrent requests created duplicates before
    # restoring the invariant.
    op.execute(
        """
        DELETE FROM certificates
        WHERE id IN (
            SELECT id
            FROM (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY user_id, course_id
                        ORDER BY completed_at, id
                    ) AS duplicate_number
                FROM certificates
            ) AS ranked_certificates
            WHERE duplicate_number > 1
        )
        """
    )
    with op.batch_alter_table("certificates") as batch_op:
        batch_op.create_unique_constraint(
            "uq_certificate_user_course", ["user_id", "course_id"]
        )


def downgrade() -> None:
    with op.batch_alter_table("certificates") as batch_op:
        batch_op.drop_constraint("uq_certificate_user_course", type_="unique")
