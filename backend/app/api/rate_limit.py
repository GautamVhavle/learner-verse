"""Lightweight in-memory per-user rate limiter for chat streaming.

Uses a sliding-window approach: stores timestamps of recent requests
per user and rejects new ones when the window is full.

Not shared across workers - acceptable for single-process / small
deployments. For multi-instance, swap for Redis-backed limiter.
"""

import time
from collections import defaultdict

from fastapi import HTTPException, status


class InMemoryRateLimiter:
    """Per-user sliding-window rate limiter."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    def check(self, user_id: str) -> None:
        """Raise 429 if rate limit exceeded."""
        now = time.monotonic()
        timestamps = self._hits[user_id]

        # Prune expired entries
        cutoff = now - self.window
        self._hits[user_id] = [t for t in timestamps if t > cutoff]

        if len(self._hits[user_id]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Max {self.max_requests} requests per {self.window}s.",
            )

        self._hits[user_id].append(now)

        # Clean up empty buckets to prevent memory leak (10.9)
        if not self._hits[user_id]:
            del self._hits[user_id]

    def cleanup(self) -> None:
        """Remove all expired entries across all users. Call periodically."""
        now = time.monotonic()
        cutoff = now - self.window
        empty_keys = []
        for uid, timestamps in self._hits.items():
            self._hits[uid] = [t for t in timestamps if t > cutoff]
            if not self._hits[uid]:
                empty_keys.append(uid)
        for uid in empty_keys:
            del self._hits[uid]


# ── Pre-configured limiters ───────────────────────────────────

# Chat streaming: 20 requests per 60 seconds per user
chat_stream_limiter = InMemoryRateLimiter(max_requests=20, window_seconds=60)

# Thread creation: 10 per 60 seconds per user
chat_thread_limiter = InMemoryRateLimiter(max_requests=10, window_seconds=60)

# AI quiz generation: 5 per 60 seconds per user
ai_generate_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)

# OpenGraph fetching: 30 per 60 seconds per user
opengraph_limiter = InMemoryRateLimiter(max_requests=30, window_seconds=60)

# Webhook: 100 per 60 seconds (global, keyed by source IP or "webhook")
webhook_limiter = InMemoryRateLimiter(max_requests=100, window_seconds=60)
