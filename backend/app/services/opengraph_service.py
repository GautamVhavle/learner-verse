"""OpenGraph metadata fetcher for URL previews.

Fetches the HTML of a URL and extracts og:title, og:description,
og:image, plus a favicon fallback. Used to generate rich link-card
previews for lesson reference links.
"""

import ipaddress
import re
import socket
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel

# Maximum bytes to read from a remote URL
_MAX_RESPONSE_BYTES = 100_000


class OpenGraphData(BaseModel):
    url: str
    title: str | None = None
    description: str | None = None
    image: str | None = None
    favicon: str | None = None
    domain: str | None = None


_OG_TAG_RE = re.compile(
    r'<meta\s+(?:[^>]*?(?:property|name)\s*=\s*["\']og:(\w+)["\'][^>]*?content\s*=\s*["\']([^"\']*)["\']'
    r'|[^>]*?content\s*=\s*["\']([^"\']*)["\'][^>]*?(?:property|name)\s*=\s*["\']og:(\w+)["\'])',
    re.IGNORECASE,
)

_TITLE_RE = re.compile(r"<title[^>]*>([^<]+)</title>", re.IGNORECASE)

_FAVICON_RE = re.compile(
    r'<link\s+[^>]*?rel\s*=\s*["\'](?:icon|shortcut icon)["\'][^>]*?href\s*=\s*["\']([^"\']+)["\']',
    re.IGNORECASE,
)


def _parse_og_tags(html: str) -> dict[str, str]:
    """Extract og:* meta tags from HTML."""
    tags: dict[str, str] = {}
    for match in _OG_TAG_RE.finditer(html):
        if match.group(1):
            tags[match.group(1)] = match.group(2)
        elif match.group(4):
            tags[match.group(4)] = match.group(3)
    return tags


def _is_private_ip(hostname: str) -> bool:
    """Check if a hostname resolves to a private/reserved IP (SSRF protection)."""
    try:
        for info in socket.getaddrinfo(hostname, None):
            addr = info[4][0]
            ip = ipaddress.ip_address(addr)
            if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
                return True
    except (socket.gaierror, ValueError):
        return True  # Cannot resolve → block
    return False


async def _validate_redirect(response: httpx.Response) -> None:
    """Block redirects that target private/internal IPs (SSRF protection)."""
    if response.is_redirect and response.has_redirect_location:
        next_url = response.headers.get("location", "")
        parsed = urlparse(next_url)
        hostname = parsed.hostname or ""
        if parsed.scheme and parsed.scheme not in ("http", "https"):
            raise ValueError("Redirect uses a disallowed scheme.")
        if hostname and _is_private_ip(hostname):
            raise ValueError("Redirect points to a private or reserved address.")


async def fetch_opengraph(url: str) -> OpenGraphData:
    """Fetch a URL and parse OpenGraph metadata from the HTML."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must use http or https.")
    domain = parsed.netloc

    # SSRF protection: block private/internal IPs
    hostname = parsed.hostname or ""
    if _is_private_ip(hostname):
        raise ValueError("URL points to a private or reserved address.")

    async with httpx.AsyncClient(
        timeout=10.0,
        follow_redirects=True,
        max_redirects=5,
        headers={"User-Agent": "LearnerVerse/1.0 (OpenGraph Fetcher)"},
        event_hooks={"response": [_validate_redirect]},
    ) as client:
        async with client.stream("GET", url) as resp:
            resp.raise_for_status()
            # Stream with byte limit to prevent memory exhaustion
            chunks: list[bytes] = []
            total = 0
            async for chunk in resp.aiter_bytes(chunk_size=8192):
                chunks.append(chunk)
                total += len(chunk)
                if total > _MAX_RESPONSE_BYTES:
                    break
            raw = b"".join(chunks)

    html = raw.decode("utf-8", errors="replace")[:50_000]

    og = _parse_og_tags(html)

    # Fallback title from <title>
    title = og.get("title")
    if not title:
        title_match = _TITLE_RE.search(html)
        title = title_match.group(1).strip() if title_match else None

    # Favicon
    favicon = None
    favicon_match = _FAVICON_RE.search(html)
    if favicon_match:
        fav = favicon_match.group(1)
        if fav.startswith("//"):
            favicon = f"{parsed.scheme}:{fav}"
        elif fav.startswith("/"):
            favicon = f"{parsed.scheme}://{domain}{fav}"
        elif fav.startswith("http"):
            favicon = fav
        else:
            favicon = f"{parsed.scheme}://{domain}/{fav}"
    else:
        favicon = f"{parsed.scheme}://{domain}/favicon.ico"

    # Resolve relative OG image
    image = og.get("image")
    if image and not image.startswith("http"):
        if image.startswith("//"):
            image = f"{parsed.scheme}:{image}"
        elif image.startswith("/"):
            image = f"{parsed.scheme}://{domain}{image}"

    return OpenGraphData(
        url=url,
        title=title,
        description=og.get("description"),
        image=image,
        favicon=favicon,
        domain=domain,
    )
