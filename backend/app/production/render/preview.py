"""Narrow renderer command builder; no user supplied commands, paths, or filters."""

from __future__ import annotations

import subprocess
from pathlib import Path

from app.production.render.schemas import RenderManifestV1


class PreviewRenderer:
    def __init__(self, ffmpeg_binary: str = "ffmpeg") -> None:
        self.ffmpeg_binary = ffmpeg_binary

    def render(self, manifest: RenderManifestV1, output: Path, *, seconds: int = 12) -> None:
        output.parent.mkdir(parents=True, exist_ok=True)
        width, height = manifest.resolution.split("x")
        seconds = min(max(seconds, 1), 30)
        # Values originate from strict Pydantic contracts; the only filter text
        # is application-owned. This isolated worker never interprets scripts.
        command = [
            self.ffmpeg_binary,
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"color=c=0x18212f:s={width}x{height}:r={manifest.fps}",
            "-t",
            str(seconds),
            "-vf",
            "drawtext=text='LearnerVerse preview':x=96:y=72:fontsize=32:fontcolor=white",
            "-pix_fmt",
            "yuv420p",
            str(output),
        ]
        subprocess.run(command, check=True, timeout=90, capture_output=True)
