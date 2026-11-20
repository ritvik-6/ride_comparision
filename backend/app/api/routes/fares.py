"""Fare comparison endpoint.

Returns deterministic demo estimates. It does not call Rapido, Uber or Ola, and
the response says so in ``source`` and ``notice``.
"""

from fastapi import APIRouter

from app.schemas.fares import (
    FareComparisonResponse,
    FareCompareRequest,
    FareEstimateModel,
    PlaceInput,
    PlaceSummary,
)
from app.services.fares import (
    DEMO_ESTIMATES_NOTICE,
    DEMO_SOURCE,
    get_demo_fare_comparison,
)

router = APIRouter(prefix="/api/v1/fares", tags=["fares"])


def _to_summary(place: PlaceInput) -> PlaceSummary:
    return PlaceSummary(
        id=place.id,
        name=place.name,
        address=place.address,
        coordinates=place.coordinates,
    )


@router.post(
    "/compare",
    response_model=FareComparisonResponse,
    summary="Compare demo ride fares",
    description=(
        "Returns sample fares and ETAs for Rapido, Uber and Ola across the Bike, "
        "Auto and Cab tiers. Values are deterministic for a given pickup and "
        "destination id, and are demo data — not live provider quotes."
    ),
    response_description="Demo estimates for every provider and tier.",
)
async def compare_fares(payload: FareCompareRequest) -> FareComparisonResponse:
    estimates = get_demo_fare_comparison(
        pickup_id=payload.pickup.id,
        destination_id=payload.destination.id,
    )

    return FareComparisonResponse(
        source=DEMO_SOURCE,
        notice=DEMO_ESTIMATES_NOTICE,
        pickup=_to_summary(payload.pickup),
        destination=_to_summary(payload.destination),
        estimates=[
            FareEstimateModel(
                id=estimate.id,
                provider=estimate.provider,
                category=estimate.category,
                tier_label=estimate.tier_label,
                fare=estimate.fare,
                currency=estimate.currency,
                eta_minutes=estimate.eta_minutes,
                available=estimate.available,
            )
            for estimate in estimates
        ],
    )
