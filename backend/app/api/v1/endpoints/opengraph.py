"""API endpoint for fetching OpenGraph metadata from URLs."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.dependencies import get_current_user
from app.api.rate_limit import opengraph_limiter
from app.models.user import User
from app.services.opengraph_service import OpenGraphData, fetch_opengraph

router = APIRouter(prefix="/opengraph", tags=["opengraph"])


class OGFetchRequest(BaseModel):
    url: str


@router.post("/fetch", response_model=OpenGraphData)
async def fetch_og_metadata(data: OGFetchRequest, user: User = Depends(get_current_user)):
    """Fetch OpenGraph metadata for a URL."""
    opengraph_limiter.check(str(user.id))
    try:
        return await fetch_opengraph(data.url)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch URL metadata.",
        )
