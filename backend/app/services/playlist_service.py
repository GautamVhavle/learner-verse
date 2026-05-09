"""YouTube playlist extraction service.

Fetches a YouTube playlist page, parses the embedded ytInitialData JSON
to extract video IDs and titles, then enriches each with thumbnail URLs.
No YouTube API key required.
"""

import json
import re

import httpx
from pydantic import BaseModel


class PlaylistVideo(BaseModel):
    video_id: str
    title: str
    thumbnail_url: str
    channel_name: str
    youtube_url: str
    position: int


class PlaylistResult(BaseModel):
    playlist_title: str
    videos: list[PlaylistVideo]


_PLAYLIST_ID_RE = re.compile(r"[?&]list=(?P<id>[A-Za-z0-9_-]+)")
_YT_INITIAL_DATA_RE = re.compile(r"var\s+ytInitialData\s*=\s*(\{.*?\});", re.DOTALL)


def _extract_playlist_id(url: str) -> str:
    """Extract the playlist ID from a YouTube playlist URL."""
    match = _PLAYLIST_ID_RE.search(url)
    if not match:
        raise ValueError("Invalid YouTube playlist URL. Expected a URL containing '?list=...'")
    return match.group("id")


def _parse_initial_data(html: str) -> dict:
    """Extract ytInitialData JSON from the YouTube playlist page HTML."""
    match = _YT_INITIAL_DATA_RE.search(html)
    if not match:
        raise ValueError("Could not extract playlist data from YouTube page.")
    return json.loads(match.group(1))


def _extract_videos_from_data(data: dict) -> tuple[str, list[dict]]:
    """Walk the ytInitialData structure to find playlist videos.

    Returns (playlist_title, list of video dicts with id/title/channel).
    """
    videos = []
    playlist_title = "Imported Playlist"

    # Navigate to the playlist contents tab
    try:
        tabs = data["contents"]["twoColumnBrowseResultsRenderer"]["tabs"]
        for tab in tabs:
            tab_renderer = tab.get("tabRenderer")
            if not tab_renderer:
                continue
            section_contents = (
                tab_renderer.get("content", {}).get("sectionListRenderer", {}).get("contents", [])
            )
            for section in section_contents:
                items_renderer = section.get("itemSectionRenderer", {})
                for content in items_renderer.get("contents", []):
                    playlist_renderer = content.get("playlistVideoListRenderer", {})
                    for video in playlist_renderer.get("contents", []):
                        vr = video.get("playlistVideoRenderer")
                        if not vr:
                            continue
                        vid_id = vr.get("videoId", "")
                        title_runs = vr.get("title", {}).get("runs", [])
                        title = title_runs[0].get("text", "Untitled") if title_runs else "Untitled"
                        channel_runs = vr.get("shortBylineText", {}).get("runs", [])
                        channel = (
                            channel_runs[0].get("text", "Unknown") if channel_runs else "Unknown"
                        )
                        if vid_id:
                            videos.append(
                                {
                                    "video_id": vid_id,
                                    "title": title,
                                    "channel": channel,
                                }
                            )
    except (KeyError, IndexError, TypeError):
        pass

    # Try to extract the playlist title from the sidebar or header
    try:
        sidebar = data.get("sidebar", {}).get("playlistSidebarRenderer", {}).get("items", [])
        for item in sidebar:
            primary = item.get("playlistSidebarPrimaryInfoRenderer", {})
            title_runs = primary.get("title", {}).get("runs", [])
            if title_runs:
                playlist_title = title_runs[0].get("text", playlist_title)
                break
    except (KeyError, IndexError, TypeError):
        pass

    # Fallback: try header
    if playlist_title == "Imported Playlist":
        try:
            header = data.get("header", {}).get("playlistHeaderRenderer", {})
            title_obj = header.get("title", {})
            if "simpleText" in title_obj:
                playlist_title = title_obj["simpleText"]
            elif "runs" in title_obj:
                playlist_title = title_obj["runs"][0]["text"]
        except (KeyError, IndexError, TypeError):
            pass

    return playlist_title, videos


async def extract_playlist(url: str) -> PlaylistResult:
    """Fetch and parse a YouTube playlist, returning all video metadata."""
    playlist_id = _extract_playlist_id(url)
    playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"

    async with httpx.AsyncClient(
        timeout=20.0,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        },
        follow_redirects=True,
    ) as client:
        resp = await client.get(playlist_url)
        resp.raise_for_status()

    playlist_title, raw_videos = _extract_videos_from_data(_parse_initial_data(resp.text))

    if not raw_videos:
        raise ValueError("No videos found in this playlist. It may be private or empty.")

    videos = [
        PlaylistVideo(
            video_id=v["video_id"],
            title=v["title"],
            thumbnail_url=f"https://img.youtube.com/vi/{v['video_id']}/hqdefault.jpg",
            channel_name=v["channel"],
            youtube_url=f"https://www.youtube.com/watch?v={v['video_id']}",
            position=i,
        )
        for i, v in enumerate(raw_videos)
    ]

    return PlaylistResult(playlist_title=playlist_title, videos=videos)
