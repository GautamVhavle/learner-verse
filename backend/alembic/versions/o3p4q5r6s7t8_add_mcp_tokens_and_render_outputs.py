"""add mcp tokens and render outputs
Revision ID: o3p4q5r6s7t8
Revises: n2o3p4q5r6s7
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
revision="o3p4q5r6s7t8"; down_revision="n2o3p4q5r6s7"; branch_labels=None; depends_on=None
JSON=sa.JSON().with_variant(postgresql.JSONB(), "postgresql"); UUID=sa.Uuid()
def upgrade():
 op.create_table("mcp_personal_access_tokens",sa.Column("id",UUID,primary_key=True),sa.Column("user_id",UUID,sa.ForeignKey("users.id",ondelete="CASCADE"),nullable=False),sa.Column("name",sa.String(100),nullable=False),sa.Column("token_prefix",sa.String(20),nullable=False,unique=True),sa.Column("verifier",sa.Text,nullable=False),sa.Column("scopes",JSON,nullable=False),sa.Column("expires_at",sa.DateTime(timezone=True)),sa.Column("revoked",sa.Boolean,nullable=False),sa.Column("last_used_at",sa.DateTime(timezone=True)),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False)); op.create_index("ix_mcp_personal_access_tokens_user_id","mcp_personal_access_tokens",["user_id"])
 op.add_column("lessons",sa.Column("video_asset_id",UUID)); op.add_column("lessons",sa.Column("captions_asset_id",UUID)); op.add_column("lessons",sa.Column("video_source",sa.String(20))); op.add_column("lessons",sa.Column("video_duration_seconds",sa.Integer)); op.add_column("lessons",sa.Column("video_provenance",JSON))
 op.create_table("production_artifacts",sa.Column("id",UUID,primary_key=True),sa.Column("user_id",UUID,sa.ForeignKey("users.id",ondelete="CASCADE"),nullable=False),sa.Column("run_id",UUID,sa.ForeignKey("production_runs.id",ondelete="CASCADE"),nullable=False),sa.Column("lesson_id",sa.String(64)),sa.Column("kind",sa.String(40),nullable=False),sa.Column("asset_version_id",UUID,sa.ForeignKey("production_asset_versions.id",ondelete="SET NULL")),sa.Column("checksum",sa.String(64),nullable=False),sa.Column("metadata",JSON,nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False)); op.create_index("idx_production_artifacts_run_lesson","production_artifacts",["run_id","lesson_id"])
 op.create_table("production_qa_reports",sa.Column("id",UUID,primary_key=True),sa.Column("user_id",UUID,sa.ForeignKey("users.id",ondelete="CASCADE"),nullable=False),sa.Column("run_id",UUID,sa.ForeignKey("production_runs.id",ondelete="CASCADE"),nullable=False,unique=True),sa.Column("status",sa.String(20),nullable=False),sa.Column("report",JSON,nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False))
def downgrade():
 op.drop_table("production_qa_reports");op.drop_table("production_artifacts");op.drop_column("lessons","video_provenance");op.drop_column("lessons","video_duration_seconds");op.drop_column("lessons","video_source");op.drop_column("lessons","captions_asset_id");op.drop_column("lessons","video_asset_id");op.drop_table("mcp_personal_access_tokens")
