"""Entry point for a small durable outbox-dispatch process."""

from __future__ import annotations

import asyncio
import logging

from app.core.config import settings
from app.core.database import async_session_maker
from app.jobs.dispatcher import OutboxDispatcher
from app.jobs.dramatiq_app import DramatiqQueueDispatcher

logger = logging.getLogger(__name__)


async def run_forever() -> None:
    dispatcher = DramatiqQueueDispatcher()
    while True:
        try:
            async with async_session_maker() as db:
                count = await OutboxDispatcher(db, dispatcher).dispatch_pending()
                if count:
                    logger.info("Dispatched %s durable job messages.", count)
        except Exception:
            logger.exception("Durable outbox dispatch failed; will retry.")
        await asyncio.sleep(settings.JOBS_OUTBOX_POLL_SECONDS)


def main() -> None:
    asyncio.run(run_forever())


if __name__ == "__main__":
    main()
