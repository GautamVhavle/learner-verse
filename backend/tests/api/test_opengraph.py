from unittest.mock import AsyncMock, patch

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


# ============================================================
# fetch_opengraph — unit tests
# ============================================================
@pytest.mark.asyncio
async def test_fetch_opengraph_success():
    mock_response = AsyncMock()
    mock_response.text = MOCK_HTML
    mock_response.raise_for_status = lambda: None

    with patch("app.services.opengraph_service.httpx.AsyncClient") as MockClient:
        instance = AsyncMock()
        instance.get.return_value = mock_response
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        result = await fetch_opengraph("https://example.com/page")

    assert result.title == "Example Page"
    assert result.description == "A test description"
    assert result.image == "https://example.com/image.jpg"
    assert result.favicon == "https://example.com/favicon.png"
    assert result.domain == "example.com"


@pytest.mark.asyncio
async def test_fetch_opengraph_fallback_title():
    mock_response = AsyncMock()
    mock_response.text = MOCK_HTML_NO_OG
    mock_response.raise_for_status = lambda: None

    with patch("app.services.opengraph_service.httpx.AsyncClient") as MockClient:
        instance = AsyncMock()
        instance.get.return_value = mock_response
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

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
    mock_response = AsyncMock()
    mock_response.text = html
    mock_response.raise_for_status = lambda: None

    with patch("app.services.opengraph_service.httpx.AsyncClient") as MockClient:
        instance = AsyncMock()
        instance.get.return_value = mock_response
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        result = await fetch_opengraph("https://example.com/page")

    assert result.image == "https://example.com/images/test.png"


# ============================================================
# POST /opengraph/fetch — API tests
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
        resp = await client.post(
            "/api/v1/opengraph/fetch", json={"url": "https://example.com"}
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Example"
    assert data["domain"] == "example.com"


@pytest.mark.asyncio
async def test_opengraph_endpoint_invalid_url(client):
    with patch("app.api.v1.endpoints.opengraph.fetch_opengraph") as mock_fetch:
        mock_fetch.side_effect = ValueError("URL must use http or https.")
        resp = await client.post(
            "/api/v1/opengraph/fetch", json={"url": "ftp://bad"}
        )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_opengraph_endpoint_fetch_failure(client):
    with patch("app.api.v1.endpoints.opengraph.fetch_opengraph") as mock_fetch:
        mock_fetch.side_effect = httpx.HTTPStatusError(
            "500", request=httpx.Request("GET", "https://down.com"), response=httpx.Response(500)
        )
        resp = await client.post(
            "/api/v1/opengraph/fetch", json={"url": "https://down.com"}
        )
    assert resp.status_code == 502
