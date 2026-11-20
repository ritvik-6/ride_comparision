"""Tests for the fare aggregator and its deterministic ordering.

Fakes are plain classes implementing the protocol, which is the point of the
seam: no credentials, no network, no monkeypatching of module globals.
"""

from __future__ import annotations

import asyncio
from typing import Sequence

import pytest

from app.services.fares.aggregator import (
    FareAggregator,
    MixedQuoteSourcesError,
    order_quotes,
)
from app.services.fares.models import (
    FareComparison,
    PlaceRef,
    ProviderCapabilities,
    ProviderId,
    ProviderQuote,
    QuoteRequest,
    QuoteSource,
    QuoteStatus,
    RideCategory,
)
from app.services.fares.providers import DemoAdapter

PICKUP = PlaceRef(id="hitech-city", name="Hitech City", address="Madhapur, Hyderabad")
DESTINATION = PlaceRef(id="airport", name="Airport", address="Shamshabad, Hyderabad")
REQUEST = QuoteRequest(pickup=PICKUP, destination=DESTINATION)


def make_quote(
    provider: ProviderId,
    category: RideCategory,
    *,
    fare: int = 100,
    available: bool = True,
) -> ProviderQuote:
    return ProviderQuote(
        provider=provider,
        category=category,
        tier_label=category.value.title(),
        fare=fare,
        currency="INR",
        eta_minutes=5,
        available=available,
        status=QuoteStatus.QUOTED if available else QuoteStatus.UNSUPPORTED,
    )


class FakeAdapter:
    """In-memory adapter: returns fixed quotes and records what it was asked."""

    def __init__(
        self,
        name: str,
        quotes: Sequence[ProviderQuote] = (),
        *,
        source: QuoteSource = QuoteSource.DEMO,
        error: Exception | None = None,
        providers: tuple[ProviderId, ...] = (ProviderId.RAPIDO,),
    ) -> None:
        self.name = name
        self.source = source
        self.quotes = tuple(quotes)
        self.error = error
        self.providers = providers
        self.capabilities = ProviderCapabilities(
            providers=providers,
            categories=None,
            coordinates_required=None,
            credentials_required=None,
            expiry_supported=None,
        )
        self.requests: list[QuoteRequest] = []

    async def compare(self, request: QuoteRequest) -> Sequence[ProviderQuote]:
        self.requests.append(request)

        if self.error is not None:
            raise self.error

        return self.quotes


def run(aggregator: FareAggregator, request: QuoteRequest = REQUEST) -> list[str]:
    comparison = asyncio.run(aggregator.compare(request))

    return [
        f"{quote.provider.value}-{quote.category.value}"
        for quote in comparison.quotes
    ]


def test_order_quotes_sorts_provider_then_category() -> None:
    quotes = [
        make_quote(ProviderId.OLA, RideCategory.CAB),
        make_quote(ProviderId.RAPIDO, RideCategory.CAB),
        make_quote(ProviderId.UBER, RideCategory.BIKE),
        make_quote(ProviderId.RAPIDO, RideCategory.AUTO),
        make_quote(ProviderId.OLA, RideCategory.AUTO),
        make_quote(ProviderId.UBER, RideCategory.CAB),
        make_quote(ProviderId.RAPIDO, RideCategory.BIKE),
        make_quote(ProviderId.OLA, RideCategory.BIKE),
        make_quote(ProviderId.UBER, RideCategory.AUTO),
    ]

    ordered = [
        (quote.provider.value, quote.category.value)
        for quote in order_quotes(quotes)
    ]

    assert ordered == [
        ("rapido", "bike"),
        ("rapido", "auto"),
        ("rapido", "cab"),
        ("uber", "bike"),
        ("uber", "auto"),
        ("uber", "cab"),
        ("ola", "bike"),
        ("ola", "auto"),
        ("ola", "cab"),
    ]


def test_order_quotes_is_stable_for_duplicate_keys() -> None:
    first = make_quote(ProviderId.UBER, RideCategory.CAB, fare=100)
    second = make_quote(ProviderId.UBER, RideCategory.CAB, fare=90)

    assert order_quotes([first, second]) == (first, second)
    assert order_quotes([second, first]) == (second, first)


def test_order_quotes_does_not_mutate_its_input() -> None:
    quotes = [make_quote(ProviderId.OLA, RideCategory.CAB)]
    snapshot = list(quotes)

    order_quotes(quotes)

    assert quotes == snapshot


def test_aggregator_orders_quotes_across_adapters() -> None:
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(
                "first",
                [
                    make_quote(ProviderId.OLA, RideCategory.CAB),
                    make_quote(ProviderId.RAPIDO, RideCategory.AUTO),
                ],
            ),
            FakeAdapter(
                "second",
                [
                    make_quote(ProviderId.UBER, RideCategory.BIKE),
                    make_quote(ProviderId.RAPIDO, RideCategory.BIKE),
                ],
            ),
        )
    )

    assert run(aggregator) == [
        "rapido-bike",
        "rapido-auto",
        "uber-bike",
        "ola-cab",
    ]


def test_aggregator_passes_the_same_request_to_every_adapter() -> None:
    first = FakeAdapter("first")
    second = FakeAdapter("second")

    run(FareAggregator(adapters=(first, second)))

    assert first.requests == [REQUEST]
    assert second.requests == [REQUEST]


def test_aggregator_reports_its_shared_source() -> None:
    aggregator = FareAggregator(
        adapters=(FakeAdapter("a"), FakeAdapter("b", source=QuoteSource.DEMO))
    )

    assert aggregator.source is QuoteSource.DEMO
    assert asyncio.run(aggregator.compare(REQUEST)).source is QuoteSource.DEMO


def test_aggregator_refuses_to_mix_demo_and_provider_sources() -> None:
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter("demo", source=QuoteSource.DEMO),
            FakeAdapter("live", source=QuoteSource.PROVIDER_API),
        )
    )

    with pytest.raises(MixedQuoteSourcesError):
        aggregator.source

    with pytest.raises(MixedQuoteSourcesError):
        asyncio.run(aggregator.compare(REQUEST))


def test_aggregator_requires_at_least_one_adapter() -> None:
    with pytest.raises(ValueError):
        FareAggregator(adapters=())


def test_adapter_errors_are_isolated_not_raised() -> None:
    """A failing provider is reported, and cannot hide another's quotes."""

    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(
                "ok",
                [make_quote(ProviderId.RAPIDO, RideCategory.BIKE)],
                providers=(ProviderId.RAPIDO,),
            ),
            FakeAdapter(
                "broken", error=RuntimeError("boom"), providers=(ProviderId.UBER,)
            ),
        )
    )

    comparison = asyncio.run(aggregator.compare(REQUEST))

    assert [quote.provider for quote in comparison.quotes] == [ProviderId.RAPIDO]
    assert {state.provider for state in comparison.provider_states} == {
        ProviderId.RAPIDO,
        ProviderId.UBER,
    }


def test_aggregator_over_demo_adapter_keeps_the_demo_order() -> None:
    aggregator = FareAggregator(adapters=(DemoAdapter(),))

    assert run(aggregator) == [
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


def test_demo_aggregator_is_deterministic() -> None:
    aggregator = FareAggregator(adapters=(DemoAdapter(),))

    first = asyncio.run(aggregator.compare(REQUEST))
    second = asyncio.run(aggregator.compare(REQUEST))

    # Quotes, source and statuses must be reproducible. latency_ms is measured
    # wall-clock time and is intentionally excluded: it can differ by a
    # millisecond between two identical calls, and asserting on it made this
    # test flaky. Demo comparisons never serialise provider states anyway.
    assert first.quotes == second.quotes
    assert first.source is second.source
    assert _state_keys(first) == _state_keys(second)


def _state_keys(comparison: FareComparison) -> list[tuple[object, ...]]:
    return [
        (state.provider, state.status, state.error_code)
        for state in comparison.provider_states
    ]
