"""Environment-based application configuration.

Values are read from ``backend/.env`` (or real environment variables, which win
over the file). Nothing here contains secrets, and every value has a safe
local-development default so the app can boot without a ``.env`` file.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]

DEFAULT_CORS_ORIGINS = "http://localhost:8081,http://localhost:19006"


class Settings(BaseSettings):
    """Typed view of the backend's environment variables."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "RideCompare API"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"

    # Comma-separated list of exact origins, e.g.
    # "http://localhost:8081,https://ridecompare.example.com".
    cors_origins: str = DEFAULT_CORS_ORIGINS

    @field_validator("app_name")
    @classmethod
    def _validate_app_name(cls, value: str) -> str:
        name = value.strip()

        if not name:
            raise ValueError("APP_NAME must not be empty")

        return name

    @field_validator("cors_origins")
    @classmethod
    def _validate_cors_origins(cls, value: str) -> str:
        origins = _split_origins(value)

        if not origins:
            raise ValueError("CORS_ORIGINS must list at least one origin")

        for origin in origins:
            # A wildcard would let any website call the API on a user's behalf.
            if origin == "*":
                raise ValueError(
                    "CORS_ORIGINS must list explicit origins; '*' is not allowed"
                )

            parsed = urlparse(origin)
            has_valid_scheme = parsed.scheme in {"http", "https"}
            has_host = bool(parsed.hostname)
            has_no_extras = not (
                parsed.path or parsed.params or parsed.query or parsed.fragment
            )

            if not (has_valid_scheme and has_host and has_no_extras):
                raise ValueError(
                    f"CORS_ORIGINS entry {origin!r} must look like "
                    "'http://localhost:8081' (scheme and host, no path)"
                )

        return value

    @property
    def cors_origin_list(self) -> list[str]:
        """The configured origins as a list, for ``CORSMiddleware``."""

        return _split_origins(self.cors_origins)


def _split_origins(value: str) -> list[str]:
    return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide settings instance."""

    return Settings()
