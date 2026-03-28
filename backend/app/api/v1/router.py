"""Central v1 API router — includes all domain endpoint routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    certificates,
    courses,
    enrollments,
    goals,
    health,
    hub,
    lessons,
    notifications,
    opengraph,
    progress,
    search,
    sections,
    stats,
    study,
    uploads,
    youtube,
)

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health.router, tags=["health"])
api_v1_router.include_router(auth.router)
api_v1_router.include_router(courses.router)
api_v1_router.include_router(enrollments.router)
api_v1_router.include_router(hub.router)
api_v1_router.include_router(sections.router)
api_v1_router.include_router(lessons.router)
api_v1_router.include_router(study.router)
api_v1_router.include_router(progress.router)
api_v1_router.include_router(certificates.router)
api_v1_router.include_router(goals.router)
api_v1_router.include_router(notifications.router)
api_v1_router.include_router(stats.router)
api_v1_router.include_router(search.router)
api_v1_router.include_router(youtube.router)
api_v1_router.include_router(opengraph.router)
api_v1_router.include_router(uploads.router)
