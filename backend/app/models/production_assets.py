"""Immutable private assets and render-manifest persistence for production."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.types import JSONVariant, TextArray, UUIDType


class ProductionAsset(Base):
    __tablename__ = "production_assets"
    __table_args__ = (
        Index("idx_production_assets_owner_state", "user_id", "state"),
        Index("idx_production_assets_checksum", "user_id", "checksum"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    source: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # upload, remote, generated, reusable
    state: Mapped[str] = mapped_column(String(32), nullable=False, default="pending_upload")
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    checksum: Mapped[str | None] = mapped_column(String(64), nullable=True)
    license: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tags: Mapped[list[str]] = mapped_column(TextArray, nullable=False, default=list)
    provenance: Mapped[dict] = mapped_column(JSONVariant, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ProductionAssetVersion(Base):
    __tablename__ = "production_asset_versions"
    __table_args__ = (
        UniqueConstraint("asset_id", "version", name="uq_production_asset_version"),
        UniqueConstraint("user_id", "checksum", name="uq_production_asset_owner_checksum"),
        Index("idx_production_asset_versions_asset", "asset_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("production_assets.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    object_key: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    byte_size: Mapped[int] = mapped_column(Integer, nullable=False)
    media_type: Mapped[str] = mapped_column(String(127), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(
        "metadata", JSONVariant, nullable=False, default=dict
    )
    provenance: Mapped[dict] = mapped_column(JSONVariant, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ProductionAssetUploadIntent(Base):
    __tablename__ = "production_asset_upload_intents"
    __table_args__ = (Index("idx_production_asset_intents_owner_expiry", "user_id", "expires_at"),)
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("production_assets.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    object_key: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    expected_size: Mapped[int] = mapped_column(Integer, nullable=False)
    expected_media_type: Mapped[str] = mapped_column(String(127), nullable=False)
    expected_checksum: Mapped[str | None] = mapped_column(String(64), nullable=True)
    upload_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="open")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ProductionAssetBinding(Base):
    __tablename__ = "production_asset_bindings"
    __table_args__ = (
        UniqueConstraint(
            "spec_version_id", "asset_request_id", name="uq_production_asset_binding_request"
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    spec_version_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("production_spec_versions.id", ondelete="CASCADE"), nullable=False
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("production_assets.id", ondelete="RESTRICT"), nullable=False
    )
    asset_version_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("production_asset_versions.id", ondelete="RESTRICT"), nullable=False
    )
    asset_request_id: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ProviderCredential(Base):
    __tablename__ = "provider_credentials"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "provider", "credential_kind", "label", name="uq_provider_credential_label"
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    credential_kind: Mapped[str] = mapped_column(String(40), nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False, default="default")
    encrypted_secret: Mapped[str] = mapped_column(Text, nullable=False)
    key_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    masked_hint: Mapped[str] = mapped_column(String(24), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class BudgetReservation(Base):
    __tablename__ = "budget_reservations"
    __table_args__ = (Index("idx_budget_reservations_owner_status", "user_id", "status"),)
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, ForeignKey("production_runs.id", ondelete="SET NULL"), nullable=True
    )
    kind: Mapped[str] = mapped_column(String(80), nullable=False)
    reserved_cost: Mapped[float] = mapped_column(Numeric(18, 6), nullable=False)
    actual_cost: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="reserved")
    metadata_json: Mapped[dict] = mapped_column(
        "metadata", JSONVariant, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RenderManifest(Base):
    __tablename__ = "render_manifests"
    __table_args__ = (
        UniqueConstraint("user_id", "input_checksum", name="uq_render_manifest_owner_input"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    spec_version_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("production_spec_versions.id", ondelete="CASCADE"), nullable=False
    )
    input_checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    manifest: Mapped[dict] = mapped_column(JSONVariant, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ProductionArtifact(Base):
    __tablename__ = "production_artifacts"
    __table_args__ = (Index("idx_production_artifacts_run_lesson", "run_id", "lesson_id"),)
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("production_runs.id", ondelete="CASCADE"), nullable=False
    )
    lesson_id: Mapped[str | None] = mapped_column(String(64))
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    asset_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, ForeignKey("production_asset_versions.id", ondelete="SET NULL")
    )
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(
        "metadata", JSONVariant, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ProductionQaReport(Base):
    __tablename__ = "production_qa_reports"
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("production_runs.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    report: Mapped[dict] = mapped_column(JSONVariant, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
