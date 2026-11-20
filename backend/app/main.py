"""FastAPI application entry point.

Run locally with:
    uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import fares, health
from app.core.config import get_settings


def create_app() -> FastAPI:
    """Build the application.

    A factory keeps imports side-effect free, so tests can construct an app
    without reading a developer's ``.env`` at import time.
    """

    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Backend for RideCompare. Fares served by this API are demo estimates; "
            "no provider APIs are wired up yet."
        ),
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(health.router)
    application.include_router(fares.router)

    return application


app = create_app()
