"""Fail-closed malware scanning adapter for the isolated asset-processing worker."""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Protocol


class MalwareScanner(Protocol):
    def scan(self, path: Path) -> None: ...


class ScanRejected(ValueError):
    pass


class ClamAVScanner:
    def __init__(self, binary: str = "clamdscan") -> None:
        self.binary = binary

    def scan(self, path: Path) -> None:
        try:
            result = subprocess.run(
                [self.binary, "--no-summary", str(path)], timeout=60, capture_output=True, text=True
            )
        except (OSError, subprocess.TimeoutExpired) as error:
            raise ScanRejected("antivirus scanner is unavailable") from error
        if result.returncode != 0:
            raise ScanRejected("asset was quarantined by antivirus")
