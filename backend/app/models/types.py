"""Cross-dialect column types that work with both PostgreSQL and SQLite.

PostgreSQL-specific types (JSONB, ARRAY, UUID) cannot always be rendered
by SQLite.  These wrappers use ``with_variant`` or generic types so the
ORM emits the optimal type for whichever database is connected.
"""

import uuid

from sqlalchemy import JSON, Text, Uuid
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.types import TypeDecorator

# JSONB on PostgreSQL, plain JSON on SQLite / others
JSONVariant = JSON().with_variant(JSONB(), "postgresql")

# Generic UUID that works on both PostgreSQL (native uuid) and SQLite (char(32))
UUIDType = Uuid(as_uuid=True)


class TextArray(TypeDecorator):
    """ARRAY(Text) on PostgreSQL, JSON list on SQLite.

    Stores a Python ``list[str]`` in either a native PG text array or as
    a JSON array for databases that lack an ARRAY type.
    """

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):  # type: ignore[override]
        if dialect.name == "postgresql":
            return dialect.type_descriptor(ARRAY(Text))
        return dialect.type_descriptor(JSON())


# Re-export uuid for convenience in models
__all__ = ["JSONVariant", "UUIDType", "TextArray", "uuid"]
