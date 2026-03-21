"""YouTube video metadata fetching via the oEmbed API.

Extracts video IDs from various YouTube URL formats and fetches
title, thumbnail, and channel information.
"""

import re

import httpx
from pydantic import BaseModel

# Supported YouTube URL patterns (watch, short-link, embed, shorts).
_YOUTUBE_PATTERNS = [
    re.compile(r"(?:https?://)?(?:www\.)?youtube\.com/watch\?.*v=(?P<id>[\w-]{11})"),
    re.compile(r"(?:https?://)?youtu\.be/(?P<id>[\w-]{11})"),
    re.compile(r"(?:https?://)?(?:www\.)?youtube\.com/embed/(?P<id>[\w-]{11})"),
    re.compile(r"(?:https?://)?(?:www\.)?youtube\.com/shorts/(?P<id>[\w-]{11})"),
]

OEMBED_URL = "https://www.youtube.com/oembed"


class YouTubeMetadata(BaseModel):
    video_id: str
    title: str
    thumbnail_url: str
    channel_name: str


def extract_video_id(url: str) -> str | None:
    """Extract YouTube video ID from various URL formats."""
    for pattern in _YOUTUBE_PATTERNS:
        match = pattern.search(url)
        if match:
            return match.group("id")
    return None


async def fetch_youtube_metadata(url: str) -> YouTubeMetadata:
    """Fetch video metadata via YouTube oEmbed API."""
    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL.")

    canonical = f"https://www.youtube.com/watch?v={video_id}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            OEMBED_URL,
            params={"url": canonical, "format": "json"},
        )
        resp.raise_for_status()

    data = resp.json()
    return YouTubeMetadata(
        video_id=video_id,
        title=data.get("title", "Untitled"),
        thumbnail_url=data.get("thumbnail_url", f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"),
        channel_name=data.get("author_name", "Unknown"),
    )
