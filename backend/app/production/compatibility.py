"""Explicit schema migration registry; migrations never silently reinterpret input."""

from __future__ import annotations

from collections.abc import Callable
from copy import deepcopy
from typing import Any

from app.production.errors import ProductionDomainError, ProductionErrorCode
from app.production.schemas.v1.course_build import SCHEMA_VERSION

SpecMigration = Callable[[dict[str, Any]], dict[str, Any]]


class SchemaMigrationRegistry:
    """Registry for adjacent, explicit CourseBuildSpec migrations."""

    def __init__(self) -> None:
        self._migrations: dict[tuple[str, str], SpecMigration] = {}

    def register(self, source: str, target: str, migration: SpecMigration) -> None:
        key = (source, target)
        if key in self._migrations:
            raise ValueError(f"migration already registered: {source} -> {target}")
        self._migrations[key] = migration

    def migrate(self, payload: dict[str, Any], target: str = SCHEMA_VERSION) -> dict[str, Any]:
        current = str(payload.get("schema_version", ""))
        if current == target:
            return deepcopy(payload)
        migration = self._migrations.get((current, target))
        if migration is None:
            raise ProductionDomainError(
                code=ProductionErrorCode.UNSUPPORTED_SCHEMA_VERSION,
                message=f"No explicit CourseBuildSpec migration exists from '{current}' to '{target}'.",
                field_path="/schema_version",
                suggested_fix="Submit a supported schema version or run a documented migration.",
            )
        migrated = migration(deepcopy(payload))
        migrated["schema_version"] = target
        return migrated


schema_migrations = SchemaMigrationRegistry()
