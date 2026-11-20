"""Tests for the fares route's dependency seam.

The route must produce exactly the payload it produced before the aggregator
existed, and must take its quote source from the injected aggregator rather than
constructing one itself.
"""

from __future__ import annotations

from typing import Any, Sequence

from fastapi.testclient import TestClient

from app.api.dependencies import get_fare_aggregator
from app.core.config import get_settings
from app.main import create_app
from app.services.fares import (
    DEMO_ESTIMATES_NOTICE,
    FareAggregator,
    ProviderCapabilities,
    ProviderId,
    ProviderQuote,
    QuoteSource,
    QuoteStatus,
    RideCategory,
    get_demo_fare_comparison,
)

ENDPOINT = "/api/v1/fares/compare"

PICKUP = {
    "id": "hitech-city",
    "name": "Hitech City",
    "address": "HITEC City, Madhapur, Hyderabad",
}

DESTINATION = {
    "id": "airport",
    "name": "Rajiv Gandhi International Airport",
    "address": "Shamshabad, Hyderabad",
}


class FixedAdapter:
    """Adapter that always returns the quotes it was constructed with."""

    name = "fixed"
    source = QuoteSource.DEMO
    providers = (ProviderId.OLA,)
    capabilities = ProviderCapabilities(
        providers=(ProviderId.OLA,),
        categories=None,
        coordinates_required=None,
        credentials_required=None,
        expiry_supported=None,
    )

    def __init__(self, quotes: Sequence[ProviderQuote]) -> None:
        self.quotes = tuple(quotes)
        self.calls = 0

    async def compare(self, request: Any) -> Sequence[ProviderQuote]:
        self.calls += 1

        return self.quotes


def make_client(aggregator: FareAggregator | None = None) -> TestClient:
    app = create_app()

    if aggregator is not None:
        app.dependency_overrides[get_fare_aggregator] = lambda: aggregator

    return TestClient(app)


def post(client: TestClient) -> Any:
    return client.post(ENDPOINT, json={"pickup": PICKUP, "destination": DESTINATION})


def legacy_payload() -> dict[str, Any]:
    """The response body the endpoint returned before the aggregator existed."""

    return {
        "source": "demo",
        "notice": DEMO_ESTIMATES_NOTICE,
        "pickup": {**PICKUP, "coordinates": None},
        "destination": {**DESTINATION, "coordinates": None},
        "estimates": [
            {
                "id": estimate.id,
                "provider": estimate.provider,
                "category": estimate.category,
                "tierLabel": estimate.tier_label,
                "fare": estimate.fare,
                "currency": estimate.currency,
                "etaMinutes": estimate.eta_minutes,
                "available": estimate.available,
            }
            for estimate in get_demo_fare_comparison("hitech-city", "airport")
        ],
    }


def test_response_is_byte_for_byte_the_legacy_payload() -> None:
    assert post(make_client()).json() == legacy_payload()


def test_estimates_keep_the_demo_order() -> None:
    estimates = post(make_client()).json()["estimates"]

    assert [estimate["id"] for estimate in estimates] == [
        "rapido-bike",
        "rapido-auto",
        "rapido-cab",
        "uber-bike",
        "uber-auto",
        "uber-cab",
        "ola-bike",
        "ola-auto",
        "ola-cab",
    ]


def test_route_uses_the_injected_aggregator() -> None:
    adapter = FixedAdapter(
        [
            ProviderQuote(
                provider=ProviderId.OLA,
                category=RideCategory.CAB,
                tier_label="Prime Sedan",
                fare=249,
                currency="INR",
                eta_minutes=6,
                available=True,
                status=QuoteStatus.QUOTED,
            )
        ]
    )
    client = make_client(FareAggregator(adapters=(adapter,)))

    body = post(client).json()

    assert adapter.calls == 1
    assert body["estimates"] == [
        {
            "id": "ola-cab",
            "provider": "ola",
            "category": "cab",
            "tierLabel": "Prime Sedan",
            "fare": 249,
            "currency": "INR",
            "etaMinutes": 6,
            "available": True,
        }
    ]
    # Echoed route details are unaffected by which adapter answered.
    assert body["pickup"] == {**PICKUP, "coordinates": None}
    assert body["destination"] == {**DESTINATION, "coordinates": None}
    assert body["source"] == "demo"
    assert body["notice"] == DEMO_ESTIMATES_NOTICE


def test_default_dependency_serves_the_demo_adapter() -> None:
    aggregator = get_fare_aggregator(get_settings())

    assert [adapter.name for adapter in aggregator.adapters] == ["demo"]
    assert aggregator.source is QuoteSource.DEMO
