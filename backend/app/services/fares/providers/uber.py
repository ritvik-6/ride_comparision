"""Placeholder for the future authorised Uber integration.

Nothing here talks to Uber: no endpoint, no credential use, no scraping. The
adapter exists so the registry has a real object to select once credentials
arrive, and so an unexpected call fails loudly instead of returning a number
that looks like a fare.
"""

from __future__ import annotations

from typing import Sequence

from app.services.fares.models import (
    ProviderCapabilities,
    ProviderId,
    ProviderQuote,
    QuoteRequest,
    QuoteSource,
)
from app.services.fares.providers.base import ProviderNotConfiguredError


class UberAdapter:
    """Skeleton adapter: reports that Uber quoting is not configured."""

    name = "uber"
    source = QuoteSource.PROVIDER_API
    providers = (ProviderId.UBER,)
    #: Credentials are required because authorised access does; the tier list,
    #: coordinate requirement and quote expiry are unverified, so they stay
    #: unknown instead of being assumed either way.
    capabilities = ProviderCapabilities(
        providers=(ProviderId.UBER,),
        categories=None,
        credentials_required=True,
        coordinates_required=None,
        expiry_supported=None,
    )

    async def compare(self, _request: QuoteRequest) -> Sequence[ProviderQuote]:
        raise ProviderNotConfiguredError(
            ProviderId.UBER,
            "Uber quoting is not configured in this build: no Uber API is "
            "called. Run the backend with PROVIDER_MODE=demo for sample estimates.",
        )
