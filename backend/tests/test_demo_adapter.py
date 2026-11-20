"""Tests for the demo adapter.

The adapter must be a faithful wrapper: same numbers, same order, same
availability as the generator the endpoint used before the seam existed.
"""

from __future__ import annotations

import asyncio
from typing import Sequence

from app.services.fares.demo_fares import get_demo_fare_comparison
from app.services.fares.models import (
    GeoPoint,
    PlaceRef,
    ProviderId,
    ProviderQuote,
    QuoteRequest,
    QuoteSource,
    QuoteStatus,
    RideCategory,
)
from app.services.fares.providers import DemoAdapter

PICKUP = PlaceRef(
    id="hitech-city",
    name="Hitech City",
    address="HITEC City, Madhapur, Hyderabad",
)

DESTINATION = PlaceRef(
    id="airport",
    name="Rajiv Gandhi International Airport",
    address="Shamshabad, Hyderabad",
)


def compare(request: QuoteRequest | None = None) -> Sequence[ProviderQuote]:
    return asyncio.run(
        DemoAdapter().compare(
            request or QuoteRequest(pickup=PICKUP, destination=DESTINATION)
        )
    )


def test_adapter_identity() -> None:
    adapter = DemoAdapter()

    assert adapter.name == "demo"
    assert adapter.source is QuoteSource.DEMO


def test_returns_one_quote_per_demo_offer() -> None:
    quotes = compare()

    assert len(quotes) == 9
    assert [(quote.provider.value, quote.category.value) for quote in quotes] == [
        (estimate.provider, estimate.category)
        for estimate in get_demo_fare_comparison("hitech-city", "airport")
    ]


def test_quotes_match_the_generator_field_for_field() -> None:
    expected = get_demo_fare_comparison("hitech-city", "airport")

    assert [
        (
            quote.provider.value,
            quote.category.value,
            quote.tier_label,
            quote.fare,
            quote.currency,
            quote.eta_minutes,
            quote.available,
        )
        for quote in compare()
    ] == [
        (
            estimate.provider,
            estimate.category,
            estimate.tier_label,
            estimate.fare,
            estimate.currency,
            estimate.eta_minutes,
            estimate.available,
        )
        for estimate in expected
    ]


def test_unsupported_tier_is_reported_as_unsupported_not_as_a_failure() -> None:
    by_key = {(quote.provider, quote.category): quote for quote in compare()}

    rapido_cab = by_key[(ProviderId.RAPIDO, RideCategory.CAB)]

    assert rapido_cab.available is False
    assert rapido_cab.status is QuoteStatus.UNSUPPORTED

    assert {
        key for key, quote in by_key.items() if quote.status is QuoteStatus.UNSUPPORTED
    } == {(ProviderId.RAPIDO, RideCategory.CAB)}
    assert all(
        quote.status is QuoteStatus.QUOTED
        for key, quote in by_key.items()
        if key != (ProviderId.RAPIDO, RideCategory.CAB)
    )


def test_every_provider_and_category_is_covered() -> None:
    quotes = compare()

    assert {quote.provider for quote in quotes} == {
        ProviderId.RAPIDO,
        ProviderId.UBER,
        ProviderId.OLA,
    }
    assert {quote.category for quote in quotes} == {
        RideCategory.BIKE,
        RideCategory.AUTO,
        RideCategory.CAB,
    }


def test_only_requested_categories_are_quoted() -> None:
    quotes = compare(
        QuoteRequest(
            pickup=PICKUP,
            destination=DESTINATION,
            categories=(RideCategory.BIKE,),
        )
    )

    assert len(quotes) == 3
    assert {quote.category for quote in quotes} == {RideCategory.BIKE}


def test_same_route_is_deterministic() -> None:
    assert compare() == compare()


def test_destination_changes_the_numbers() -> None:
    other = QuoteRequest(
        pickup=PICKUP,
        destination=PlaceRef(
            id="secunderabad",
            name="Secunderabad",
            address="Secunderabad, Hyderabad",
        ),
    )

    assert [quote.fare for quote in compare(other)] != [
        quote.fare for quote in compare()
    ]


def test_coordinates_never_change_the_quote() -> None:
    """Demo prices are not derived from GPS; coordinates only pass through."""

    with_coordinates = QuoteRequest(
        pickup=PlaceRef(
            id=PICKUP.id,
            name=PICKUP.name,
            address=PICKUP.address,
            coordinates=GeoPoint(latitude=17.4435, longitude=78.3772),
        ),
        destination=PlaceRef(
            id=DESTINATION.id,
            name=DESTINATION.name,
            address=DESTINATION.address,
            coordinates=GeoPoint(latitude=17.2403, longitude=78.4294),
        ),
    )

    assert compare(with_coordinates) == compare()


def test_request_is_not_mutated() -> None:
    request = QuoteRequest(pickup=PICKUP, destination=DESTINATION)

    compare(request)

    assert request == QuoteRequest(pickup=PICKUP, destination=DESTINATION)
