"""Tests for provider capabilities and how the aggregator applies them.

The point of capabilities is to answer "can this provider serve this request?"
without asking it, and without ever guessing an answer it has not declared.
"""

from __future__ import annotations

import asyncio
from typing import Any, Sequence

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_fare_aggregator
from app.core.config import Settings
from app.main import create_app
from app.services.fares.aggregator import FareAggregator
from app.services.fares.models import (
    CATEGORY_ORDER,
    PROVIDER_ORDER,
    GeoPoint,
    PlaceRef,
    ProviderCapabilities,
    ProviderErrorCode,
    ProviderId,
    ProviderQuote,
    ProviderStatus,
    QuoteRequest,
    QuoteSource,
    QuoteStatus,
    RideCategory,
)
from app.services.fares.providers import (
    DemoAdapter,
    OlaAdapter,
    RapidoAdapter,
    UberAdapter,
)

PICKUP = PlaceRef(id="hitech-city", name="Hitech City", address="Madhapur")
DESTINATION = PlaceRef(id="airport", name="Airport", address="Shamshabad")

REQUEST = QuoteRequest(pickup=PICKUP, destination=DESTINATION)

REQUEST_WITH_COORDINATES = QuoteRequest(
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

PLACES = {
    "pickup": {"id": "hitech-city", "name": "Hitech City", "address": "Madhapur"},
    "destination": {"id": "airport", "name": "Airport", "address": "Shamshabad"},
}

ALL_ADAPTERS = [DemoAdapter, RapidoAdapter, UberAdapter, OlaAdapter]
SKELETONS = [RapidoAdapter, UberAdapter, OlaAdapter]


def make_quote(provider: ProviderId, category: RideCategory) -> ProviderQuote:
    return ProviderQuote(
        provider=provider,
        category=category,
        tier_label=category.value.title(),
        fare=100,
        currency="INR",
        eta_minutes=5,
        available=True,
        status=QuoteStatus.QUOTED,
    )


def make_capabilities(
    provider: ProviderId = ProviderId.UBER,
    *,
    categories: frozenset[RideCategory] | None = None,
    coordinates_required: bool | None = False,
    credentials_required: bool | None = False,
    expiry_supported: bool | None = False,
) -> ProviderCapabilities:
    return ProviderCapabilities(
        providers=(provider,),
        categories=categories,
        credentials_required=credentials_required,
        coordinates_required=coordinates_required,
        expiry_supported=expiry_supported,
    )


class FakeAdapter:
    """Adapter with declared capabilities, recording every request it gets."""

    source = QuoteSource.PROVIDER_API

    def __init__(
        self,
        name: str,
        capabilities: ProviderCapabilities,
        quotes: Sequence[ProviderQuote] = (),
    ) -> None:
        self.name = name
        self.capabilities = capabilities
        self.providers = capabilities.providers
        self.quotes = tuple(quotes)
        self.requests: list[QuoteRequest] = []

    async def compare(self, request: QuoteRequest) -> Sequence[ProviderQuote]:
        self.requests.append(request)

        return self.quotes


# --- the declaration itself ------------------------------------------------


def test_unverified_capabilities_stay_unknown() -> None:
    capabilities = make_capabilities(categories=None)

    assert capabilities.categories is None
    assert capabilities.known is False
    assert capabilities.supports(RideCategory.BIKE) is None


def test_verified_empty_set_is_not_the_same_as_unknown() -> None:
    capabilities = make_capabilities(categories=frozenset())

    assert capabilities.known is True
    assert capabilities.supports(RideCategory.CAB) is False


def test_capabilities_need_at_least_one_provider() -> None:
    with pytest.raises(ValueError, match="at least one provider"):
        ProviderCapabilities(
            providers=(),
            categories=None,
            credentials_required=None,
            coordinates_required=None,
            expiry_supported=None,
        )


def test_capabilities_reject_duplicate_providers() -> None:
    with pytest.raises(ValueError, match="unique"):
        ProviderCapabilities(
            providers=(ProviderId.UBER, ProviderId.UBER),
            categories=None,
            credentials_required=None,
            coordinates_required=None,
            expiry_supported=None,
        )


@pytest.mark.parametrize(
    "adapter_class",
    ALL_ADAPTERS,
    ids=lambda adapter_class: adapter_class.__name__,
)
def test_every_adapter_declares_capabilities_for_its_own_providers(
    adapter_class: type,
) -> None:
    adapter = adapter_class()

    assert isinstance(adapter.capabilities, ProviderCapabilities)
    assert adapter.capabilities.providers == adapter.providers


def test_demo_capabilities_are_verified_facts() -> None:
    capabilities = DemoAdapter().capabilities

    assert capabilities.providers == PROVIDER_ORDER
    assert capabilities.categories == frozenset(CATEGORY_ORDER)
    assert capabilities.credentials_required is False
    assert capabilities.coordinates_required is False
    assert capabilities.expiry_supported is False


@pytest.mark.parametrize(
    "adapter_class",
    SKELETONS,
    ids=lambda adapter_class: adapter_class.__name__,
)
def test_live_skeletons_do_not_invent_capabilities(adapter_class: type) -> None:
    """No authorised capability statement exists, so nothing may be assumed."""

    capabilities = adapter_class().capabilities

    assert capabilities.categories is None
    assert capabilities.coordinates_required is None
    assert capabilities.expiry_supported is None
    # This one is known: that is why the registry demands a key pair.
    assert capabilities.credentials_required is True


# --- how the aggregator applies them ---------------------------------------


def test_unsupported_category_is_skipped_rather_than_failed() -> None:
    adapter = FakeAdapter(
        "uber",
        make_capabilities(categories=frozenset({RideCategory.BIKE})),
    )
    aggregator = FareAggregator(adapters=(adapter,))

    comparison = asyncio.run(
        aggregator.compare(
            QuoteRequest(
                pickup=PICKUP,
                destination=DESTINATION,
                categories=(RideCategory.AUTO,),
            )
        )
    )

    assert adapter.requests == []
    assert comparison.quotes == ()
    state = comparison.provider_states[0]
    assert state.status is ProviderStatus.UNSUPPORTED
    assert state.error_code is None
    assert state.latency_ms == 0
    assert state.status not in {ProviderStatus.FAILED, ProviderStatus.TIMED_OUT}


def test_request_is_narrowed_to_the_declared_categories() -> None:
    adapter = FakeAdapter(
        "rapido",
        make_capabilities(
            ProviderId.RAPIDO,
            categories=frozenset({RideCategory.BIKE, RideCategory.AUTO}),
        ),
        quotes=[
            make_quote(ProviderId.RAPIDO, RideCategory.BIKE),
            make_quote(ProviderId.RAPIDO, RideCategory.AUTO),
        ],
    )
    aggregator = FareAggregator(adapters=(adapter,))

    comparison = asyncio.run(aggregator.compare(REQUEST))

    assert len(adapter.requests) == 1
    assert adapter.requests[0].categories == (
        RideCategory.BIKE,
        RideCategory.AUTO,
    )
    assert {quote.category for quote in comparison.quotes} == {
        RideCategory.BIKE,
        RideCategory.AUTO,
    }
    assert comparison.provider_states[0].status is ProviderStatus.SUCCESS


def test_unknown_capabilities_are_not_narrowed() -> None:
    adapter = FakeAdapter("uber", make_capabilities(categories=None))
    aggregator = FareAggregator(adapters=(adapter,))

    asyncio.run(aggregator.compare(REQUEST))

    assert adapter.requests[0].categories == CATEGORY_ORDER


def test_missing_required_coordinates_skips_the_call() -> None:
    adapter = FakeAdapter(
        "ola",
        make_capabilities(ProviderId.OLA, coordinates_required=True),
    )
    aggregator = FareAggregator(adapters=(adapter,))

    comparison = asyncio.run(aggregator.compare(REQUEST))

    assert adapter.requests == []
    state = comparison.provider_states[0]
    assert state.status is ProviderStatus.UNSUPPORTED
    assert state.error_code is ProviderErrorCode.MISSING_COORDINATES


def test_present_coordinates_allow_the_call() -> None:
    adapter = FakeAdapter(
        "ola",
        make_capabilities(ProviderId.OLA, coordinates_required=True),
        quotes=[make_quote(ProviderId.OLA, RideCategory.CAB)],
    )
    aggregator = FareAggregator(adapters=(adapter,))

    comparison = asyncio.run(aggregator.compare(REQUEST_WITH_COORDINATES))

    assert len(adapter.requests) == 1
    assert comparison.provider_states[0].status is ProviderStatus.SUCCESS
    assert len(comparison.quotes) == 1


def test_unknown_coordinate_requirement_does_not_block_the_call() -> None:
    adapter = FakeAdapter(
        "ola",
        make_capabilities(ProviderId.OLA, coordinates_required=None),
    )
    aggregator = FareAggregator(adapters=(adapter,))

    asyncio.run(aggregator.compare(REQUEST))

    assert len(adapter.requests) == 1


def test_demo_adapter_is_never_narrowed_or_skipped() -> None:
    aggregator = FareAggregator(adapters=(DemoAdapter(),))

    comparison = asyncio.run(aggregator.compare(REQUEST))

    assert len(comparison.quotes) == 9
    assert {state.status for state in comparison.provider_states} == {
        ProviderStatus.SUCCESS
    }


def test_aggregator_rejects_capabilities_for_other_providers() -> None:
    adapter = FakeAdapter("uber", make_capabilities(ProviderId.OLA))
    adapter.providers = (ProviderId.UBER,)

    with pytest.raises(ValueError, match="capabilities"):
        FareAggregator(adapters=(adapter,))


def test_capability_skip_reaches_the_wire_as_unsupported() -> None:
    # The endpoint always requests every tier, so a skip needs a provider that
    # is *verified* to serve none of them.
    adapter = FakeAdapter("uber", make_capabilities(categories=frozenset()))
    app = create_app(Settings(_env_file=None))
    app.dependency_overrides[get_fare_aggregator] = lambda: FareAggregator(
        adapters=(adapter,)
    )

    response = TestClient(app).post("/api/v1/fares/compare", json=PLACES)

    assert response.status_code == 200
    body: dict[str, Any] = response.json()
    assert body["estimates"] == []
    assert body["providerStates"] == [
        {
            "provider": "uber",
            "status": "unsupported",
            "latencyMs": 0,
            "errorCode": None,
        }
    ]
