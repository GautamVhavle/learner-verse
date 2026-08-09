"""Private object-store abstraction with a local streaming implementation."""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import shutil
import uuid
from collections.abc import AsyncIterable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Protocol


@dataclass(frozen=True)
class SignedObjectReference:
    object_key: str
    expires_at: datetime
    token: str


class ObjectStore(Protocol):
    async def put_stream(
        self, key: str, data: AsyncIterable[bytes], *, max_bytes: int
    ) -> tuple[int, str]: ...
    async def read_range(self, key: str, start: int = 0, end: int | None = None) -> bytes: ...
    async def delete(self, key: str) -> None: ...
    def create_multipart_upload(self, key: str) -> str: ...
    async def upload_part(
        self, upload_id: str, part_number: int, data: AsyncIterable[bytes], *, max_bytes: int
    ) -> str: ...
    async def complete_multipart_upload(
        self, upload_id: str, part_numbers: list[int]
    ) -> tuple[int, str]: ...
    def presign_download(self, key: str, expires_in: int) -> SignedObjectReference: ...
    def verify_download(self, reference: SignedObjectReference) -> bool: ...


class LocalObjectStore:
    """Filesystem-backed private store used locally and in deterministic tests.

    The returned reference is an opaque, expiry-bound capability—not a public
    file URL. HTTP delivery is deliberately deferred to the authenticated API.
    """

    def __init__(self, root: str | Path, signing_key: str) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self._parts = self.root / ".multipart"
        self._parts.mkdir(exist_ok=True)
        self._signing_key = signing_key.encode()

    def _path(self, key: str) -> Path:
        candidate = (self.root / key).resolve()
        if not str(candidate).startswith(f"{self.root}{os.sep}"):
            raise ValueError("invalid object key")
        return candidate

    async def put_stream(
        self, key: str, data: AsyncIterable[bytes], *, max_bytes: int
    ) -> tuple[int, str]:
        target = self._path(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        temp = target.with_suffix(target.suffix + f".{uuid.uuid4().hex}.partial")
        digest, total = hashlib.sha256(), 0
        try:
            with temp.open("wb") as output:
                async for chunk in data:
                    if not isinstance(chunk, bytes):
                        raise ValueError("upload stream must yield bytes")
                    total += len(chunk)
                    if total > max_bytes:
                        raise ValueError("asset exceeds size limit")
                    digest.update(chunk)
                    output.write(chunk)
            os.replace(temp, target)
            return total, digest.hexdigest()
        finally:
            temp.unlink(missing_ok=True)

    async def read_range(self, key: str, start: int = 0, end: int | None = None) -> bytes:
        if start < 0 or (end is not None and end < start):
            raise ValueError("invalid byte range")
        with self._path(key).open("rb") as source:
            source.seek(start)
            return source.read(None if end is None else end - start + 1)

    async def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)

    def create_multipart_upload(self, key: str) -> str:
        self._path(key)  # validate before state is created
        upload_id = uuid.uuid4().hex
        (self._parts / upload_id).mkdir()
        return upload_id

    async def upload_part(
        self, upload_id: str, part_number: int, data: AsyncIterable[bytes], *, max_bytes: int
    ) -> str:
        if part_number < 1:
            raise ValueError("part number must be positive")
        part_dir = self._parts / upload_id
        if not part_dir.is_dir() or "/" in upload_id:
            raise ValueError("unknown multipart upload")
        return (
            await self.put_stream(
                f".multipart/{upload_id}/{part_number:08d}", data, max_bytes=max_bytes
            )
        )[1]

    async def complete_multipart_upload(
        self, upload_id: str, part_numbers: list[int]
    ) -> tuple[int, str]:
        part_dir = self._parts / upload_id
        if not part_dir.is_dir() or sorted(set(part_numbers)) != part_numbers:
            raise ValueError("invalid multipart completion")
        digest, total = hashlib.sha256(), 0
        assembled = self._parts / f"{upload_id}.assembled"
        with assembled.open("wb") as output:
            for number in part_numbers:
                part = part_dir / f"{number:08d}"
                if not part.is_file():
                    raise ValueError("missing multipart part")
                with part.open("rb") as source:
                    shutil.copyfileobj(source, output)
                content = part.read_bytes()
                digest.update(content)
                total += len(content)
        shutil.rmtree(part_dir)
        # caller promotes the assembled object only after intent validation
        return total, digest.hexdigest()

    def presign_download(self, key: str, expires_in: int) -> SignedObjectReference:
        if expires_in <= 0:
            raise ValueError("expiry must be positive")
        self._path(key)
        expiry = datetime.now(UTC) + timedelta(seconds=expires_in)
        payload = f"{key}:{int(expiry.timestamp())}".encode()
        token = base64.urlsafe_b64encode(
            hmac.new(self._signing_key, payload, hashlib.sha256).digest()
        ).decode()
        return SignedObjectReference(key, expiry, token)

    def verify_download(self, reference: SignedObjectReference) -> bool:
        if reference.expires_at <= datetime.now(UTC):
            return False
        payload = f"{reference.object_key}:{int(reference.expires_at.timestamp())}".encode()
        expected = base64.urlsafe_b64encode(
            hmac.new(self._signing_key, payload, hashlib.sha256).digest()
        ).decode()
        return hmac.compare_digest(expected, reference.token)
