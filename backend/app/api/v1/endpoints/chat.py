"""API endpoints for LiVi chat — thread CRUD and streaming responses."""

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.api.rate_limit import chat_stream_limiter, chat_thread_limiter
from app.core.database import get_db
from app.models.user import User
from app.repositories.chat_repo import ChatRepository
from app.schemas.chat import (
    ChatRequest,
    InlineChatRequest,
    MessageResponse,
    ThreadCreate,
    ThreadDetailResponse,
    ThreadListResponse,
    ThreadRename,
    ThreadResponse,
)
from app.services.chat_service import ChatService, InlineChatService

router = APIRouter(prefix="/chat", tags=["chat"])

# Matches control characters (except newline, tab) that shouldn't appear in chat
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
MAX_THREADS_PER_USER = 50


def _sanitize(text: str) -> str:
    """Strip control characters from user input."""
    return _CONTROL_CHARS.sub("", text).strip()


def _repo(db: AsyncSession) -> ChatRepository:
    return ChatRepository(db)


# ── Thread CRUD ────────────────────────────────────────────────


@router.post("/threads", response_model=ThreadResponse, status_code=status.HTTP_201_CREATED)
async def create_thread(
    data: ThreadCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat_thread_limiter.check(str(user.id))
    repo = _repo(db)
    # Enforce max thread count
    existing = await repo.list_threads(user.id)
    if len(existing) >= MAX_THREADS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_THREADS_PER_USER} threads allowed. Delete old chats to continue.",
        )
    title = _sanitize(data.title) or "New Chat"
    thread = await repo.create_thread(user.id, title)
    await db.commit()
    return ThreadResponse.model_validate(thread)


@router.get("/threads", response_model=ThreadListResponse)
async def list_threads(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = _repo(db)
    threads = await repo.list_threads(user.id)
    items = []
    for t in threads:
        last_msg = await repo.get_last_message(t.id)
        preview = None
        if last_msg:
            preview = last_msg.content[:100] + ("…" if len(last_msg.content) > 100 else "")
        items.append(
            ThreadResponse(
                id=t.id,
                title=t.title,
                created_at=t.created_at,
                updated_at=t.updated_at,
                message_preview=preview,
            )
        )
    return ThreadListResponse(items=items)


@router.get("/threads/{thread_id}", response_model=ThreadDetailResponse)
async def get_thread(
    thread_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = _repo(db)
    thread = await repo.get_thread_with_messages(thread_id, user.id)
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")
    return ThreadDetailResponse(
        id=thread.id,
        title=thread.title,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        messages=[MessageResponse.model_validate(m) for m in thread.messages],
    )


@router.put("/threads/{thread_id}", response_model=ThreadResponse)
async def rename_thread(
    thread_id: uuid.UUID,
    data: ThreadRename,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = _repo(db)
    thread = await repo.get_thread(thread_id, user.id)
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")
    await repo.rename_thread(thread, data.title)
    await db.commit()
    return ThreadResponse.model_validate(thread)


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(
    thread_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = _repo(db)
    thread = await repo.get_thread(thread_id, user.id)
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")
    await repo.delete_thread(thread)
    await db.commit()


# ── Streaming Chat ─────────────────────────────────────────────


@router.post("/threads/{thread_id}/stream")
async def stream_chat(
    thread_id: uuid.UUID,
    data: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream an AI response for the given thread. Returns text/plain chunks."""
    chat_stream_limiter.check(str(user.id))
    repo = _repo(db)
    thread = await repo.get_thread(thread_id, user.id)
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")

    message = _sanitize(data.message)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty."
        )

    service = ChatService(db)

    async def generate():
        try:
            async for chunk in service.stream_response(
                thread_id, user.id, message, page_context=data.context
            ):
                yield chunk
        except Exception as exc:
            import logging

            logging.getLogger(__name__).error("Chat stream error: %s", exc, exc_info=True)
            yield "\n\nSorry, something went wrong. Please try again."

    return StreamingResponse(
        generate(),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )


# ── Inline Contextual Chat ────────────────────────────────────


@router.post("/inline/stream")
async def stream_inline_chat(
    data: InlineChatRequest,
    user: User = Depends(get_current_user),
):
    """Stream a stateless context-aware AI response for inline lesson help."""
    chat_stream_limiter.check(str(user.id))

    message = _sanitize(data.message)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )

    service = InlineChatService()

    history = [{"role": m.role, "content": m.content} for m in data.history]

    async def generate():
        try:
            async for chunk in service.stream_response(
                message, history, data.context_type, data.context_data
            ):
                yield chunk
        except Exception as exc:
            import logging

            logging.getLogger(__name__).error("Inline chat stream error: %s", exc, exc_info=True)
            yield "\n\nSorry, something went wrong. Please try again."

    return StreamingResponse(
        generate(),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )
