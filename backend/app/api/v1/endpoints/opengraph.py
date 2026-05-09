"""API endpoint for fetching OpenGraph metadata from URLs."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.opengraph_service import OpenGraphData, fetch_opengraph

router = APIRouter(prefix="/opengraph", tags=["opengraph"])


class OGFetchRequest(BaseModel):
    url: str


@router.post("/fetch", response_model=OpenGraphData)
async def fetch_og_metadata(data: OGFetchRequest):
    """Fetch OpenGraph metadata for a URL."""
    try:
        return await fetch_opengraph(data.url)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch URL metadata.",
        )
