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


_REDIRECT_STATUSES = {301, 302, 303, 307, 308}
_MAX_REDIRECTS = 5
_BLOCKED_HOST_SUFFIXES = (".localhost", ".local", ".internal", ".localdomain")


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Reject anything that is not a globally routable address.

    IPv4-mapped IPv6 is judged as the embedded IPv4 address. ``is_global``
    also excludes loopback, link-local (cloud metadata), CGNAT, and
    documentation ranges that ``is_private`` alone misses.
    """
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return not ip.is_global


def _resolve_public_ip(hostname: str) -> str:
    """Resolve a hostname and return one public IP to connect to.

    The caller connects to this IP directly so a DNS rebind between the
    check and the socket cannot point the request at an internal address.
    """
    host = hostname.strip().strip("[]").rstrip(".").lower()
    if (
        not host
        or host == "localhost"
        or host.endswith(_BLOCKED_HOST_SUFFIXES)
        or host.endswith(".metadata.google.internal")
    ):
        raise ValueError("URL points to a private or reserved address.")

    literal: ipaddress.IPv4Address | ipaddress.IPv6Address | None
    try:
        literal = ipaddress.ip_address(host)
    except ValueError:
        literal = None
    if literal is not None:
        if _is_blocked_ip(literal):
            raise ValueError("URL points to a private or reserved address.")
        return str(literal)

    try:
        infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError("URL points to a private or reserved address.") from exc

    seen: list[str] = []
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if _is_blocked_ip(ip):
            raise ValueError("URL points to a private or reserved address.")
        mapped = ip.ipv4_mapped if isinstance(ip, ipaddress.IPv6Address) else None
        rendered = str(mapped or ip)
        if rendered not in seen:
            seen.append(rendered)
    if not seen:
        raise ValueError("URL points to a private or reserved address.")
    return seen[0]


def _host_header(scheme: str, hostname: str, port: int | None) -> str:
    host = f"[{hostname}]" if ":" in hostname else hostname
    if port is None or (scheme == "https" and port == 443) or (scheme == "http" and port == 80):
        return host
    return f"{host}:{port}"


def _next_url(current: str, location: str) -> str:
    joined = str(httpx.URL(current).join(location))
    parsed = urlparse(joined)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("Redirect uses a disallowed scheme.")
    return joined


async def fetch_opengraph(url: str) -> OpenGraphData:
    """Fetch a URL and parse OpenGraph metadata from the HTML."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must use http or https.")
    if not parsed.hostname:
        raise ValueError("URL points to a private or reserved address.")

    current = url
    raw = b""
    async with httpx.AsyncClient(
        timeout=10.0,
        follow_redirects=False,
        headers={"User-Agent": "LearnerVerse/1.0 (OpenGraph Fetcher)"},
    ) as client:
        for _hop in range(_MAX_REDIRECTS + 1):
            hop = urlparse(current)
            if hop.scheme not in ("http", "https") or not hop.hostname:
                raise ValueError("Redirect uses a disallowed scheme.")
            ip = _resolve_public_ip(hop.hostname)
            pinned = httpx.URL(current).copy_with(host=ip)
            async with client.stream(
                "GET",
                pinned,
                headers={"Host": _host_header(hop.scheme, hop.hostname, hop.port)},
                extensions={"sni_hostname": hop.hostname},
            ) as resp:
                if resp.status_code in _REDIRECT_STATUSES:
                    location = resp.headers.get("location")
                    if not location:
                        raise ValueError("Redirect uses a disallowed scheme.")
                    current = _next_url(current, location)
                    continue
                resp.raise_for_status()
                chunks: list[bytes] = []
                total = 0
                async for chunk in resp.aiter_bytes(chunk_size=8192):
                    chunks.append(chunk)
                    total += len(chunk)
                    if total > _MAX_RESPONSE_BYTES:
                        break
                raw = b"".join(chunks)
                break
        else:
            raise ValueError("Too many redirects.")

    parsed = urlparse(current)
    domain = parsed.netloc

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
