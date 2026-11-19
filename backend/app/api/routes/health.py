"""Liveness endpoint."""

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns the application name and status. Used by uptime checks and dev tooling.",
)
async def read_health() -> HealthResponse:
    settings = get_settings()

    return HealthResponse(
        status="ok",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
    )
