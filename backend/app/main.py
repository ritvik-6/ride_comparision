"""FastAPI application entry point.

Run locally with:
    uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import fares, health
from app.core.config import Settings, get_settings
from app.services.fares.registry import build_adapters


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the application.

    A factory keeps imports side-effect free, so tests can construct an app
    without reading a developer's ``.env`` at import time, and can pass explicit
    settings instead of relying on the process environment.
    """

    resolved = settings or get_settings()

    if resolved.provider_mode == "live":
        # Refuse to serve live mode that cannot serve a live quote. Validating
        # here means a broken deployment fails at startup rather than turning
        # every comparison into a 500 (or, worse, into demo numbers).
        build_adapters(resolved)

    application = FastAPI(
        title=resolved.app_name,
        version=resolved.app_version,
        description=(
            "Backend for RideCompare. Fares are demo estimates by default; "
            "authorised provider quoting is opt-in via PROVIDER_MODE and no "
            "provider integration is implemented yet, so live mode reports "
            "every provider as not configured."
        ),
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Make the resolved settings authoritative for every dependency, not just
    # for startup validation. Without this, ``create_app(custom_settings)``
    # would validate live mode and then serve demo mode from the route.
    application.dependency_overrides[get_settings] = lambda: resolved

    application.include_router(health.router)
    application.include_router(fares.router)

    return application


app = create_app()
