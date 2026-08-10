from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.opengraph_service import OpenGraphData, fetch_opengraph

MOCK_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta property="og:title" content="Example Page">
    <meta property="og:description" content="A test description">
    <meta property="og:image" content="https://example.com/image.jpg">
    <title>Fallback Title</title>
    <link rel="icon" href="/favicon.png">
</head>
<body></body>
</html>
"""

MOCK_HTML_NO_OG = """
<!DOCTYPE html>
<html>
<head><title>Simple Page</title></head>
<body></body>
</html>
"""


def _mock_stream_client(html: str):
    """Create a mock httpx.AsyncClient that simulates client.stream("GET", url).

    The service reads chunks via ``resp.aiter_bytes()`` inside an
    ``async with client.stream(...)`` context manager, so we need a
    two-level async-CM mock.
    """
    html_bytes = html.encode("utf-8")

    # The inner response object (yielded by `async with client.stream(...)`)
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()

    async def _aiter_bytes(chunk_size=8192):
        yield html_bytes

    mock_resp.aiter_bytes = _aiter_bytes

    # Inner CM: `async with client.stream("GET", url) as resp:`
    stream_cm = AsyncMock()
    stream_cm.__aenter__ = AsyncMock(return_value=mock_resp)
    stream_cm.__aexit__ = AsyncMock(return_value=False)

    # The client instance
    instance = MagicMock()
    instance.stream = MagicMock(return_value=stream_cm)
    instance.__aenter__ = AsyncMock(return_value=instance)
    instance.__aexit__ = AsyncMock(return_value=False)

    return instance


# ============================================================
# fetch_opengraph - unit tests
# ============================================================
@pytest.mark.asyncio
async def test_fetch_opengraph_success():
    instance = _mock_stream_client(MOCK_HTML)

    with (
        patch("app.services.opengraph_service.httpx.AsyncClient", return_value=instance),
        patch("app.services.opengraph_service._is_private_ip", return_value=False),
    ):
        result = await fetch_opengraph("https://example.com/page")

    assert result.title == "Example Page"
    assert result.description == "A test description"
    assert result.image == "https://example.com/image.jpg"
    assert result.favicon == "https://example.com/favicon.png"
    assert result.domain == "example.com"


@pytest.mark.asyncio
async def test_fetch_opengraph_fallback_title():
    instance = _mock_stream_client(MOCK_HTML_NO_OG)

    with (
        patch("app.services.opengraph_service.httpx.AsyncClient", return_value=instance),
        patch("app.services.opengraph_service._is_private_ip", return_value=False),
    ):
        result = await fetch_opengraph("https://example.com")

    assert result.title == "Simple Page"
    assert result.description is None
    assert result.image is None
    assert result.domain == "example.com"


@pytest.mark.asyncio
async def test_fetch_opengraph_invalid_scheme():
    with pytest.raises(ValueError, match="http or https"):
        await fetch_opengraph("ftp://example.com")


@pytest.mark.asyncio
async def test_fetch_opengraph_relative_image():
    html = '<meta property="og:image" content="/images/test.png"><title>T</title>'
    instance = _mock_stream_client(html)

    with (
        patch("app.services.opengraph_service.httpx.AsyncClient", return_value=instance),
        patch("app.services.opengraph_service._is_private_ip", return_value=False),
    ):
        result = await fetch_opengraph("https://example.com/page")

    assert result.image == "https://example.com/images/test.png"


# ============================================================
# POST /opengraph/fetch - API tests
# ============================================================
@pytest.mark.asyncio
async def test_opengraph_endpoint_success(client):
    with patch("app.api.v1.endpoints.opengraph.fetch_opengraph") as mock_fetch:
        mock_fetch.return_value = OpenGraphData(
            url="https://example.com",
            title="Example",
            description="Desc",
            image="https://example.com/img.jpg",
            favicon="https://example.com/favicon.ico",
            domain="example.com",
        )
        resp = await client.post("/api/v1/opengraph/fetch", json={"url": "https://example.com"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Example"
    assert data["domain"] == "example.com"


@pytest.mark.asyncio
async def test_opengraph_endpoint_invalid_url(client):
    with patch("app.api.v1.endpoints.opengraph.fetch_opengraph") as mock_fetch:
        mock_fetch.side_effect = ValueError("URL must use http or https.")
        resp = await client.post("/api/v1/opengraph/fetch", json={"url": "ftp://bad"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_opengraph_endpoint_fetch_failure(client):
    with patch("app.api.v1.endpoints.opengraph.fetch_opengraph") as mock_fetch:
        mock_fetch.side_effect = httpx.HTTPStatusError(
            "500", request=httpx.Request("GET", "https://down.com"), response=httpx.Response(500)
        )
        resp = await client.post("/api/v1/opengraph/fetch", json={"url": "https://down.com"})
    assert resp.status_code == 502


# ============================================================
# Additional edge-case tests
# ============================================================


@pytest.mark.asyncio
async def test_fetch_opengraph_ssrf_private_ip():
    """URLs pointing to private IPs should be rejected (SSRF protection)."""
    with pytest.raises(ValueError, match="private or reserved"):
        await fetch_opengraph("https://127.0.0.1/admin")


@pytest.mark.asyncio
async def test_fetch_opengraph_no_title():
    """Page with no og:title and no <title> returns None for title."""
    html = "<html><head></head><body>No title here</body></html>"
    instance = _mock_stream_client(html)

    with (
        patch("app.services.opengraph_service.httpx.AsyncClient", return_value=instance),
        patch("app.services.opengraph_service._is_private_ip", return_value=False),
    ):
        result = await fetch_opengraph("https://example.com")

    assert result.title is None
    assert result.domain == "example.com"


@pytest.mark.asyncio
async def test_fetch_opengraph_protocol_relative_image():
    """Protocol-relative og:image (//cdn.example.com/img.jpg) is resolved."""
    html = '<meta property="og:image" content="//cdn.example.com/pic.jpg"><title>T</title>'
    instance = _mock_stream_client(html)

    with (
        patch("app.services.opengraph_service.httpx.AsyncClient", return_value=instance),
        patch("app.services.opengraph_service._is_private_ip", return_value=False),
    ):
        result = await fetch_opengraph("https://example.com")

    assert result.image == "https://cdn.example.com/pic.jpg"


@pytest.mark.asyncio
async def test_opengraph_endpoint_missing_url_field(client):
    """POST /opengraph/fetch without url field returns 422."""
    resp = await client.post("/api/v1/opengraph/fetch", json={})
    assert resp.status_code == 422
