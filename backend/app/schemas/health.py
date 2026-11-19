"""Response model for the health endpoint."""

from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Liveness payload. Deliberately says nothing about downstream services."""

    status: Literal["ok"] = Field(description="Always 'ok' when the process can answer.")
    app: str = Field(description="Application name from configuration.")
    version: str = Field(description="Application version from configuration.")
    environment: str = Field(description="Deployment environment name.")
