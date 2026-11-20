"""Placeholder for the future authorised Ola integration.

Nothing here talks to Ola: no endpoint, no credential use, no scraping, and no
fabricated affiliate ``utm_source``. The adapter exists so the registry has a
real object to select once partner credentials arrive, and so an unexpected call
fails loudly instead of returning a number that looks like a fare.
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


class OlaAdapter:
    """Skeleton adapter: reports that Ola quoting is not configured."""

    name = "ola"
    source = QuoteSource.PROVIDER_API
    providers = (ProviderId.OLA,)
    #: Credentials are required because partner access does; the tier list,
    #: coordinate requirement and quote expiry are unverified, so they stay
    #: unknown instead of being assumed either way.
    capabilities = ProviderCapabilities(
        providers=(ProviderId.OLA,),
        categories=None,
        credentials_required=True,
        coordinates_required=None,
        expiry_supported=None,
    )

    async def compare(self, _request: QuoteRequest) -> Sequence[ProviderQuote]:
        raise ProviderNotConfiguredError(
            ProviderId.OLA,
            "Ola quoting is not configured in this build: no Ola partner API is "
            "called. Run the backend with PROVIDER_MODE=demo for sample estimates.",
        )
