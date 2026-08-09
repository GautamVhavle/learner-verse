"""Canonical JSON helpers used for idempotency and immutable specs."""

from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical_json(value: Any) -> str:
    """Return stable JSON without whitespace or non-deterministic key order."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def checksum(value: Any) -> str:
    """Return a SHA-256 checksum of canonical JSON."""
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()
