"""OpenGraph metadata fetcher for URL previews.

Fetches the HTML of a URL and extracts og:title, og:description,
og:image, plus a favicon fallback. Used to generate rich link-card
previews for lesson reference links.
"""

import re
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel


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


async def fetch_opengraph(url: str) -> OpenGraphData:
    """Fetch a URL and parse OpenGraph metadata from the HTML."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must use http or https.")
    domain = parsed.netloc

    async with httpx.AsyncClient(
        timeout=10.0,
        follow_redirects=True,
        headers={"User-Agent": "LearnerVerse/1.0 (OpenGraph Fetcher)"},
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    html = resp.text[:50_000]  # Only parse first 50KB

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
