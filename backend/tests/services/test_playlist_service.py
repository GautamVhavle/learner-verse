"""Unit tests for playlist_service._extract_videos_from_data.

Tests both the legacy ``playlistVideoRenderer`` structure (pre-2024) and the
current ``lockupViewModel`` structure that YouTube switched to in 2025.
"""

import pytest

from app.services.playlist_service import (
    _extract_videos_from_data,
    _extract_playlist_id,
)


# ---------------------------------------------------------------------------
# Helpers: minimal fake ytInitialData payloads
# ---------------------------------------------------------------------------

def _make_lockup_item(video_id: str, title: str, channel: str) -> dict:
    """Build a minimal lockupViewModel entry matching the current YouTube schema."""
    return {
        "lockupViewModel": {
            "contentId": video_id,
            "contentType": "LOCKUP_CONTENT_TYPE_VIDEO",
            "metadata": {
                "lockupMetadataViewModel": {
                    "title": {"content": title},
                    "image": {
                        "decoratedAvatarViewModel": {
                            "a11yLabel": f"Go to channel {channel}"
                        }
                    },
                }
            },
            "contentImage": {
                "thumbnailViewModel": {
                    "image": {
                        "sources": [
                            {"url": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"}
                        ]
                    }
                }
            },
        }
    }


def _make_legacy_item(video_id: str, title: str, channel: str) -> dict:
    """Build a minimal playlistVideoRenderer entry matching the old YouTube schema."""
    return {
        "playlistVideoRenderer": {
            "videoId": video_id,
            "title": {"runs": [{"text": title}]},
            "shortBylineText": {"runs": [{"text": channel}]},
        }
    }


def _wrap_in_data(items: list[dict], playlist_title: str = "Test Playlist") -> dict:
    """Wrap a list of video items in a minimal ytInitialData structure."""
    return {
        "contents": {
            "twoColumnBrowseResultsRenderer": {
                "tabs": [
                    {
                        "tabRenderer": {
                            "content": {
                                "sectionListRenderer": {
                                    "contents": [
                                        {
                                            "itemSectionRenderer": {
                                                "contents": items
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "header": {
            "playlistHeaderRenderer": {
                "title": {"simpleText": playlist_title}
            }
        },
        "sidebar": {},
    }


# ---------------------------------------------------------------------------
# _extract_playlist_id
# ---------------------------------------------------------------------------

def test_extract_playlist_id_standard():
    url = "https://www.youtube.com/playlist?list=PLIhvC56v63IJIujb5cyE13oLuyORZpdkL"
    assert _extract_playlist_id(url) == "PLIhvC56v63IJIujb5cyE13oLuyORZpdkL"


def test_extract_playlist_id_with_si_param():
    url = "https://youtube.com/playlist?list=PLIhvC56v63IJIujb5cyE13oLuyORZpdkL&si=SRvGIW1MHcEc4AJr"
    assert _extract_playlist_id(url) == "PLIhvC56v63IJIujb5cyE13oLuyORZpdkL"


def test_extract_playlist_id_watch_url():
    url = "https://www.youtube.com/watch?v=abc123&list=PLtest123&index=1"
    assert _extract_playlist_id(url) == "PLtest123"


def test_extract_playlist_id_invalid_raises():
    with pytest.raises(ValueError, match="Invalid YouTube playlist URL"):
        _extract_playlist_id("https://www.youtube.com/watch?v=abc123")


# ---------------------------------------------------------------------------
# _extract_videos_from_data — new lockupViewModel schema (current YouTube)
# ---------------------------------------------------------------------------

def test_lockup_extracts_video_id():
    """The new lockupViewModel.contentId must be used as the video ID."""
    data = _wrap_in_data([_make_lockup_item("VbEx7B_PTOE", "Linux EP1", "NetworkChuck")])
    _, videos = _extract_videos_from_data(data)
    assert len(videos) == 1
    assert videos[0]["video_id"] == "VbEx7B_PTOE"


def test_lockup_extracts_title():
    data = _wrap_in_data([_make_lockup_item("VbEx7B_PTOE", "Linux for Hackers EP1", "NetworkChuck")])
    _, videos = _extract_videos_from_data(data)
    assert videos[0]["title"] == "Linux for Hackers EP1"


def test_lockup_extracts_channel():
    data = _wrap_in_data([_make_lockup_item("VbEx7B_PTOE", "Video Title", "NetworkChuck")])
    _, videos = _extract_videos_from_data(data)
    assert videos[0]["channel"] == "NetworkChuck"


def test_lockup_extracts_multiple_videos():
    items = [
        _make_lockup_item("id1", "Title 1", "Chan A"),
        _make_lockup_item("id2", "Title 2", "Chan B"),
        _make_lockup_item("id3", "Title 3", "Chan C"),
    ]
    data = _wrap_in_data(items)
    _, videos = _extract_videos_from_data(data)
    assert len(videos) == 3
    assert [v["video_id"] for v in videos] == ["id1", "id2", "id3"]


def test_lockup_skips_non_video_content_types():
    """Items with contentType != LOCKUP_CONTENT_TYPE_VIDEO should be ignored."""
    items = [
        {
            "lockupViewModel": {
                "contentId": "shortId",
                "contentType": "LOCKUP_CONTENT_TYPE_SHORT",
                "metadata": {
                    "lockupMetadataViewModel": {
                        "title": {"content": "A Short"},
                        "image": {"decoratedAvatarViewModel": {"a11yLabel": "Go to channel X"}},
                    }
                },
            }
        },
        _make_lockup_item("videoId1", "Real Video", "Real Channel"),
    ]
    data = _wrap_in_data(items)
    _, videos = _extract_videos_from_data(data)
    assert len(videos) == 1
    assert videos[0]["video_id"] == "videoId1"


def test_lockup_skips_item_with_missing_content_id():
    items = [
        {
            "lockupViewModel": {
                "contentType": "LOCKUP_CONTENT_TYPE_VIDEO",
                "metadata": {
                    "lockupMetadataViewModel": {
                        "title": {"content": "No ID"},
                        "image": {"decoratedAvatarViewModel": {"a11yLabel": "Go to channel X"}},
                    }
                },
            }
        }
    ]
    data = _wrap_in_data(items)
    _, videos = _extract_videos_from_data(data)
    assert videos == []


def test_lockup_playlist_title_from_header():
    data = _wrap_in_data(
        [_make_lockup_item("id1", "T1", "C1")],
        playlist_title="My Python Course",
    )
    title, _ = _extract_videos_from_data(data)
    assert title == "My Python Course"


# ---------------------------------------------------------------------------
# _extract_videos_from_data — legacy playlistVideoRenderer schema (old YouTube)
# ---------------------------------------------------------------------------

def test_legacy_extracts_video_id():
    data = _wrap_in_data(
        [
            {
                "playlistVideoListRenderer": {
                    "contents": [_make_legacy_item("vid001", "Old Video", "OldChan")]
                }
            }
        ]
    )
    _, videos = _extract_videos_from_data(data)
    assert len(videos) == 1
    assert videos[0]["video_id"] == "vid001"


def test_legacy_extracts_title_and_channel():
    data = _wrap_in_data(
        [
            {
                "playlistVideoListRenderer": {
                    "contents": [_make_legacy_item("vid001", "Legacy Title", "Legacy Chan")]
                }
            }
        ]
    )
    _, videos = _extract_videos_from_data(data)
    assert videos[0]["title"] == "Legacy Title"
    assert videos[0]["channel"] == "Legacy Chan"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

def test_empty_data_returns_empty_videos():
    _, videos = _extract_videos_from_data({})
    assert videos == []


def test_mixed_old_and_new_items_in_same_section():
    """If both item types appear (shouldn't happen in practice, but should be robust)."""
    items = [
        _make_lockup_item("newId", "New Style", "NewChan"),
        {
            "playlistVideoListRenderer": {
                "contents": [_make_legacy_item("oldId", "Old Style", "OldChan")]
            }
        },
    ]
    data = _wrap_in_data(items)
    _, videos = _extract_videos_from_data(data)
    video_ids = [v["video_id"] for v in videos]
    assert "newId" in video_ids
    assert "oldId" in video_ids
