"""Provider-neutral contracts. Concrete network providers belong behind these interfaces."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class GeneratedAsset:
    data: bytes
    media_type: str
    provider: str
    model: str
    seed: str | None = None


class TextProvider(Protocol):
    async def complete(self, prompt: str) -> str: ...


class NarrationProvider(Protocol):
    async def narrate(
        self, text: str, voice: str, *, ssml: str | None = None
    ) -> GeneratedAsset: ...


class ImageProvider(Protocol):
    async def generate_image(self, prompt: str, *, seed: str | None = None) -> GeneratedAsset: ...


class MusicProvider(Protocol):
    async def generate_music(self, prompt: str, duration_seconds: float) -> GeneratedAsset: ...


class FakeNarrationProvider:
    """Deterministic test double; production must register an authenticated provider."""

    async def narrate(self, text: str, voice: str, *, ssml: str | None = None) -> GeneratedAsset:
        return GeneratedAsset(
            data=(voice + "\n" + text).encode(),
            media_type="audio/wav",
            provider="fake",
            model="deterministic",
        )
