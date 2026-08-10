"""add completed_at to course_enrollments

Revision ID: k5l6m7n8o9p0
Revises: j4k5l6m7n8o9
Create Date: 2025-07-21

Adds a nullable completed_at column to course_enrollments. Backfills
existing enrollments where the user has completed ALL lessons for a course
by setting completed_at = MAX(lesson_progress.completed_at).
"""

from alembic import op
import sqlalchemy as sa

revision = "k5l6m7n8o9p0"
down_revision = "j4k5l6m7n8o9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "course_enrollments",
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Backfill: for each enrollment where ALL lessons are completed,
    # set completed_at = MAX(lesson_progress.completed_at)
    op.execute(
        """
        UPDATE course_enrollments AS ce
        SET completed_at = sub.max_completed_at
        FROM (
            SELECT
                ce2.user_id,
                ce2.course_id,
                MAX(lp.completed_at) AS max_completed_at
            FROM course_enrollments ce2
            JOIN sections s ON s.course_id = ce2.course_id
            JOIN lessons l ON l.section_id = s.id
            LEFT JOIN lesson_progress lp
                ON lp.lesson_id = l.id AND lp.user_id = ce2.user_id AND lp.completed = true
            GROUP BY ce2.user_id, ce2.course_id
            HAVING COUNT(l.id) = COUNT(lp.id) AND COUNT(l.id) > 0
        ) sub
        WHERE ce.user_id = sub.user_id AND ce.course_id = sub.course_id
        """
    )


def downgrade() -> None:
    op.drop_column("course_enrollments", "completed_at")
