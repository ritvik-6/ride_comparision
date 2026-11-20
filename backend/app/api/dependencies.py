"""FastAPI dependencies shared by the API routes.

Keeping construction here rather than inside handlers means a test can swap one
object (``app.dependency_overrides``) and the route's own code stays unchanged.
"""

from typing import Annotated

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.services.fares.aggregator import FareAggregator
from app.services.fares.registry import build_adapters


def build_fare_aggregator(settings: Settings) -> FareAggregator:
    """Build the aggregator for ``settings``.

    Raises ``ProviderRegistryConfigurationError`` when ``PROVIDER_MODE=live`` is
    set without a usable provider, so a misconfigured deployment fails on the
    request instead of silently serving demo numbers as live ones.
    """

    return FareAggregator(
        adapters=build_adapters(settings),
        request_timeout_seconds=settings.provider_request_timeout_seconds,
        total_budget_seconds=settings.provider_total_budget_seconds,
    )


def get_fare_aggregator(
    settings: Annotated[Settings, Depends(get_settings)],
) -> FareAggregator:
    """The aggregator serving fare comparisons, chosen by configuration."""

    return build_fare_aggregator(settings)
