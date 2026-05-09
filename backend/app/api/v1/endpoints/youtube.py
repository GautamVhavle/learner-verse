"""API endpoint for fetching YouTube video metadata via oEmbed."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.youtube_service import YouTubeMetadata, fetch_youtube_metadata

router = APIRouter(prefix="/youtube", tags=["youtube"])


class YouTubeURLRequest(BaseModel):
    url: str


@router.post("/metadata", response_model=YouTubeMetadata)
async def get_youtube_metadata(data: YouTubeURLRequest):
    """Fetch metadata for a YouTube video URL."""
    try:
        return await fetch_youtube_metadata(data.url)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch YouTube metadata. The video may be unavailable.",
        )
