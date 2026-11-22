"""Adapter over the deterministic demo fare generator.

This is the only adapter today. It performs no I/O: it reuses
:func:`app.services.fares.demo_fares.get_demo_fare_comparison`, so the numbers,
tier names, availability and ordering are exactly what the endpoint returned
before the seam existed. The parity fixture keeps the underlying generator
honest against the app's TypeScript implementation.

Availability is mapped rather than copied: the demo table's ``available=False``
row means "Rapido does not serve cabs here", which is
:class:`QuoteStatus` ``UNSUPPORTED``, not a failure.
"""

from __future__ import annotations

from typing import Sequence

from app.services.fares.demo_fares import DemoFareEstimate, get_demo_fare_comparison
from app.services.fares.models import (
    CATEGORY_ORDER,
    PROVIDER_ORDER,
    ProviderCapabilities,
    ProviderId,
    ProviderQuote,
    QuoteRequest,
    QuoteSource,
    QuoteStatus,
    RideCategory,
)


def _to_quote(estimate: DemoFareEstimate) -> ProviderQuote:
    return ProviderQuote(
        provider=ProviderId(estimate.provider),
        category=RideCategory(estimate.category),
        tier_label=estimate.tier_label,
        fare=estimate.fare,
        currency=estimate.currency,
        eta_minutes=estimate.eta_minutes,
        available=estimate.available,
        status=QuoteStatus.QUOTED if estimate.available else QuoteStatus.UNSUPPORTED,
    )


class DemoAdapter:
    """Serves sample quotes for all three providers and categories."""

    name = "demo"
    source = QuoteSource.DEMO
    providers = PROVIDER_ORDER
    #: The demo table really does cover every tier, needs no credentials, works
    #: without coordinates, and has no notion of quote expiry. Unlike the live
    #: skeletons, these are known facts rather than unverified guesses.
    capabilities = ProviderCapabilities(
        providers=PROVIDER_ORDER,
        categories=frozenset(CATEGORY_ORDER),
        credentials_required=False,
        coordinates_required=False,
        expiry_supported=False,
    )

    async def compare(self, request: QuoteRequest) -> Sequence[ProviderQuote]:
        """Build demo quotes for the request's route.

        The place ids still reach the generator, so an id-only request produces
        exactly the estimates it always did. When the client measured a road
        route, that distance and duration price the same offer table instead;
        coordinates on their own are never turned into a fare.
        """

        route = request.route

        estimates = get_demo_fare_comparison(
            pickup_id=request.pickup.id,
            destination_id=request.destination.id,
            route_distance_km=None if route is None else route.distance_km,
            route_duration_minutes=None if route is None else route.duration_minutes,
        )

        requested = set(request.categories)

        return tuple(
            _to_quote(estimate)
            for estimate in estimates
            if RideCategory(estimate.category) in requested
        )
