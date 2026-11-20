"""Environment-based application configuration.

Values are read from ``backend/.env`` (or real environment variables, which win
over the file). Every value has a safe local-development default so the app can
boot without a ``.env`` file, and provider integrations are off unless a
developer turns them on explicitly.

Provider credentials are ``SecretStr``: they are only readable through
``get_secret_value()``, so a ``repr``, a log line or a Pydantic dump shows
``**********`` instead of the value.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]

DEFAULT_CORS_ORIGINS = "http://localhost:8081,http://localhost:19006"

#: ``demo`` serves sample estimates; ``live`` serves authorised provider quotes.
ProviderMode = Literal["demo", "live"]


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

    # --- Provider integrations -------------------------------------------
    # Demo is the default and the only mode this build can actually serve.
    # ``live`` requires at least one provider to be enabled *and* configured,
    # which the registry enforces when the aggregator is built.
    provider_mode: ProviderMode = "demo"

    # Per-provider call timeout, and the ceiling for one whole comparison.
    provider_request_timeout_seconds: float = Field(default=4.0, gt=0, le=60)
    provider_total_budget_seconds: float = Field(default=6.0, gt=0, le=120)

    # Credentials for future authorised provider APIs. Nothing in this build
    # calls a provider, so these are read, validated and otherwise unused.
    # Leave empty (or unset) to keep a provider off.
    uber_enabled: bool = False
    uber_client_id: SecretStr | None = None
    uber_client_secret: SecretStr | None = None

    ola_enabled: bool = False
    ola_client_id: SecretStr | None = None
    ola_client_secret: SecretStr | None = None

    rapido_enabled: bool = False
    rapido_client_id: SecretStr | None = None
    rapido_client_secret: SecretStr | None = None

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

    @model_validator(mode="after")
    def _validate_timeout_budget(self) -> "Settings":
        # A total budget below one request timeout would cut every provider off
        # at the same instant, which reads as "no rides" rather than "slow".
        if self.provider_total_budget_seconds < self.provider_request_timeout_seconds:
            raise ValueError(
                "PROVIDER_TOTAL_BUDGET_SECONDS must be greater than or equal to "
                "PROVIDER_REQUEST_TIMEOUT_SECONDS"
            )

        return self

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
