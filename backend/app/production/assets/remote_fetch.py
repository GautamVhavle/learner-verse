"""SSRF-resistant remote asset URL validation and bounded streaming fetch."""

from __future__ import annotations

import ipaddress
import socket
from collections.abc import AsyncIterator
from urllib.parse import urlparse

import httpx


class UnsafeRemoteURL(ValueError):
    pass


class SafeRemoteURL:
    def __init__(self, max_bytes: int, timeout_seconds: float, max_redirects: int = 3) -> None:
        self.max_bytes, self.timeout_seconds, self.max_redirects = (
            max_bytes,
            timeout_seconds,
            max_redirects,
        )

    @staticmethod
    def _is_public(ip: str) -> bool:
        address = ipaddress.ip_address(ip)
        return (
            address.is_global
            and not address.is_private
            and not address.is_loopback
            and not address.is_link_local
            and not address.is_reserved
        )

    def validate(self, url: str) -> str:
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise UnsafeRemoteURL("only absolute HTTPS URLs without credentials are allowed")
        try:
            addresses = {
                item[4][0]
                for item in socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
            }
        except socket.gaierror as error:
            raise UnsafeRemoteURL("host cannot be resolved") from error
        if not addresses or not all(self._is_public(address) for address in addresses):
            raise UnsafeRemoteURL("remote host resolves to a non-public address")
        return url

    async def fetch(self, url: str) -> AsyncIterator[bytes]:
        current = self.validate(url)
        async with httpx.AsyncClient(
            timeout=self.timeout_seconds, follow_redirects=False
        ) as client:
            for _ in range(self.max_redirects + 1):
                self.validate(current)  # re-resolve each hop to reduce DNS rebinding risk
                async with client.stream(
                    "GET", current, headers={"Accept": "image/*,audio/*,video/*"}
                ) as response:
                    if response.status_code in {301, 302, 303, 307, 308}:
                        location = response.headers.get("location")
                        if not location:
                            raise UnsafeRemoteURL("redirect lacks location")
                        current = str(httpx.URL(current).join(location))
                        continue
                    response.raise_for_status()
                    content_type = response.headers.get("content-type", "").split(";", 1)[0]
                    if not content_type.startswith(("image/", "audio/", "video/")):
                        raise UnsafeRemoteURL("remote content is not media")
                    total = 0
                    async for chunk in response.aiter_bytes():
                        total += len(chunk)
                        if total > self.max_bytes:
                            raise UnsafeRemoteURL("remote asset exceeds size limit")
                        yield chunk
                    return
        raise UnsafeRemoteURL("too many redirects")
