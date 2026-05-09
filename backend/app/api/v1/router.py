"""Central v1 API router — includes all domain endpoint routers."""

import logging

from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    auth,
    certificates,
    chat,
    courses,
    discussions,
    enrollments,
    goals,
    health,
    hub,
    lessons,
    notifications,
    opengraph,
    profile,
    progress,
    quiz,
    search,
    sections,
    share,
    stats,
    study,
    uploads,
    youtube,
)
from app.core.config import settings

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health.router, tags=["health"])
api_v1_router.include_router(auth.router)
api_v1_router.include_router(analytics.router)
api_v1_router.include_router(courses.router)
api_v1_router.include_router(enrollments.router)
api_v1_router.include_router(hub.router)
api_v1_router.include_router(sections.router)
api_v1_router.include_router(lessons.router)
api_v1_router.include_router(quiz.router)
api_v1_router.include_router(study.router)
api_v1_router.include_router(progress.router)
api_v1_router.include_router(certificates.router)
api_v1_router.include_router(chat.router)
api_v1_router.include_router(discussions.router)
api_v1_router.include_router(goals.router)
api_v1_router.include_router(notifications.router)
api_v1_router.include_router(stats.router)
api_v1_router.include_router(search.router)
api_v1_router.include_router(youtube.router)
api_v1_router.include_router(opengraph.router)
api_v1_router.include_router(profile.router)
api_v1_router.include_router(share.router)
api_v1_router.include_router(uploads.router)

# Payment / subscription endpoints are only registered when the payment
# gateway is explicitly enabled AND the private submodule is present.
if settings.PAYMENT_GATEWAY_ENABLED:
    try:
        from app.api.v1.endpoints import subscription

        api_v1_router.include_router(subscription.router)
    except ImportError:
        logging.getLogger(__name__).warning(
            "PAYMENT_GATEWAY_ENABLED=true but the subscription module was not "
            "found. Did you initialize the private submodule? "
            "(git submodule update --init)"
        )
