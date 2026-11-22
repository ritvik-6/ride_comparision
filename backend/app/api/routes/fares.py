"""Fare comparison endpoint.

The route is a thin translation layer: it maps the wire request into domain
objects, hands them to the aggregator, and maps the result back. It does not know
which providers were asked, and it does not decide what happens when one of them
fails — it only reports the outcome faithfully in ``source``, ``notice`` and
``providerStates``.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Response
from fastapi.responses import JSONResponse

from app.api.dependencies import get_fare_aggregator
from app.schemas.fares import (
    Coordinates,
    FareComparisonResponse,
    FareCompareRequest,
    FareEstimateModel,
    PlaceInput,
    PlaceSummary,
    ProviderStateModel,
    RouteMetricsInput,
)
from app.services.fares import DEMO_ESTIMATES_NOTICE
from app.services.fares.aggregator import FareAggregator
from app.services.fares.models import (
    GeoPoint,
    PlaceRef,
    ProviderQuote,
    ProviderState,
    QuoteRequest,
    QuoteSource,
    RouteMetrics,
)
from app.services.fares.notices import LIVE_ESTIMATES_NOTICE, LIVE_NO_QUOTES_NOTICE

router = APIRouter(prefix="/api/v1/fares", tags=["fares"])


def _to_summary(place: PlaceInput) -> PlaceSummary:
    return PlaceSummary(
        id=place.id,
        name=place.name,
        address=place.address,
        coordinates=place.coordinates,
    )


def _to_geo_point(coordinates: Coordinates | None) -> GeoPoint | None:
    if coordinates is None:
        return None

    return GeoPoint(
        latitude=coordinates.latitude,
        longitude=coordinates.longitude,
    )


def _to_place_ref(place: PlaceInput) -> PlaceRef:
    return PlaceRef(
        id=place.id,
        name=place.name,
        address=place.address,
        coordinates=_to_geo_point(place.coordinates),
    )


def _to_route_metrics(route: RouteMetricsInput | None) -> RouteMetrics | None:
    """Validated road metrics, or None when the client measured no route."""

    if route is None:
        return None

    return RouteMetrics(
        distance_km=route.distance_km,
        duration_minutes=route.duration_minutes,
    )


def _to_quote_request(payload: FareCompareRequest) -> QuoteRequest:
    return QuoteRequest(
        pickup=_to_place_ref(payload.pickup),
        destination=_to_place_ref(payload.destination),
        route=_to_route_metrics(payload.route),
    )


def _to_estimate_model(quote: ProviderQuote) -> FareEstimateModel:
    return FareEstimateModel(
        # '<provider>-<category>' is the id the app and the demo fixture use.
        id=f"{quote.provider.value}-{quote.category.value}",
        provider=quote.provider.value,
        category=quote.category.value,
        tier_label=quote.tier_label,
        fare=quote.fare,
        currency=quote.currency,
        eta_minutes=quote.eta_minutes,
        available=quote.available,
    )


def _to_provider_state_model(state: ProviderState) -> ProviderStateModel:
    return ProviderStateModel(
        provider=state.provider.value,
        status=state.status.value,
        latency_ms=state.latency_ms,
        error_code=None if state.error_code is None else state.error_code.value,
    )


@router.post(
    "/compare",
    response_model=FareComparisonResponse,
    summary="Compare ride fares",
    description=(
        "Returns fares and ETAs for Rapido, Uber and Ola across the Bike, Auto "
        "and Cab tiers. Responses are demo estimates by default (`source: "
        "'demo'`); when the optional `route` object is supplied the estimates are "
        "priced from that measured road distance and duration, otherwise the "
        "sample variation stays deterministic per pickup/destination id. "
        "Authorised provider "
        "quotes are opt-in via PROVIDER_MODE and reported with `source: "
        "'provider-api'` plus a per-provider status list. A provider that fails "
        "or times out contributes no estimate and never removes another "
        "provider's quote."
    ),
    response_description="Fare estimates plus per-provider status for live mode.",
)
async def compare_fares(
    payload: FareCompareRequest,
    aggregator: Annotated[FareAggregator, Depends(get_fare_aggregator)],
) -> Response:
    comparison = await aggregator.compare(_to_quote_request(payload))
    is_live = comparison.source is QuoteSource.PROVIDER_API
    estimates = [_to_estimate_model(quote) for quote in comparison.quotes]

    if not is_live:
        notice = DEMO_ESTIMATES_NOTICE
    elif estimates:
        notice = LIVE_ESTIMATES_NOTICE
    else:
        notice = LIVE_NO_QUOTES_NOTICE

    model = FareComparisonResponse(
        source=comparison.source.value,
        notice=notice,
        pickup=_to_summary(payload.pickup),
        destination=_to_summary(payload.destination),
        estimates=estimates,
        # Provider states describe live providers only.
        provider_states=(
            [_to_provider_state_model(state) for state in comparison.provider_states]
            if is_live
            else None
        ),
    )

    # The demo payload is a published contract, so `providerStates` is dropped
    # rather than serialised as null or an empty list for demo comparisons.
    # A plain model return would add the key; excluding it here keeps demo
    # responses byte-for-byte identical while live responses carry the states.
    return JSONResponse(
        content=model.model_dump(
            by_alias=True,
            exclude=None if is_live else {"provider_states"},
        )
    )
