import hashlib
import uuid
from pathlib import Path

import pytest

from app.production.assets.credentials import CredentialCipher
from app.production.assets.remote_fetch import SafeRemoteURL, UnsafeRemoteURL
from app.production.assets.storage import LocalObjectStore
from app.production.render.compiler import RenderManifestCompiler, as_webvtt
from app.production.render.schemas import ManifestAsset
from app.production.schemas.v1.course_build import CourseBuildSpec

async def chunks(data: bytes): yield data

@pytest.mark.asyncio
async def test_private_store_stream_range_signed_expiry_and_path_guard(tmp_path: Path):
    store = LocalObjectStore(tmp_path, "test-signing-key")
    size, checksum = await store.put_stream("assets/a/v1", chunks(b"hello"), max_bytes=10)
    assert (size, checksum) == (5, hashlib.sha256(b"hello").hexdigest())
    assert await store.read_range("assets/a/v1", 1, 3) == b"ell"
    signed = store.presign_download("assets/a/v1", 60); assert store.verify_download(signed)
    with pytest.raises(ValueError): await store.put_stream("../escape", chunks(b"x"), max_bytes=2)
    await store.delete("assets/a/v1")

def test_cipher_rotates_and_never_returns_plaintext():
    from cryptography.fernet import Fernet
    old, new = Fernet.generate_key().decode(), Fernet.generate_key().decode()
    encrypted = CredentialCipher(old).encrypt("super-secret")
    cipher = CredentialCipher(f"{new},{old}")
    assert cipher.decrypt(encrypted) == "super-secret" and "super-secret" not in encrypted
    assert CredentialCipher.masked("super-secret") == "…cret"

def test_ssrf_rejects_private_and_non_https(monkeypatch):
    import app.production.assets.remote_fetch as module
    def resolver(*args, **kwargs): return [(None, None, None, None, ("127.0.0.1", 443))]
    monkeypatch.setattr(module.socket, "getaddrinfo", resolver)
    guard = SafeRemoteURL(100, 1)
    with pytest.raises(UnsafeRemoteURL): guard.validate("https://example.com/a.png")
    with pytest.raises(UnsafeRemoteURL): guard.validate("http://example.com/a.png")

def test_manifest_is_deterministic_and_generates_unicode_captions():
    spec = CourseBuildSpec.model_validate({"request_id":"test-request-01","course":{"title":"T","description":"D"},"sections":[{"id":"s","title":"S","lessons":[{"id":"l","title":"L","learning_objectives":["Learn"],"script":{"narration":"Hello world. नमस्ते दुनिया!","scenes":[{"id":"a","type":"text","on_screen_text":["Hello"]}]}}]}]})
    assets = {}
    first = RenderManifestCompiler().compile(spec, assets); second = RenderManifestCompiler().compile(spec, assets)
    assert first.input_checksum == second.input_checksum
    vtt = as_webvtt(first.lessons[0].captions)
    assert vtt.startswith("WEBVTT") and "नमस्ते" in vtt
