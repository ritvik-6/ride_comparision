"""Tests for provider failure isolation in the aggregator.

Every case here is about what happens when a provider misbehaves: the others
must still be able to answer, and the failure must be described without leaking
anything the provider said.
"""

from __future__ import annotations

import asyncio
from typing import Sequence

import pytest

from app.services.fares.aggregator import FareAggregator
from app.services.fares.models import (
    PROVIDER_ORDER,
    FareComparison,
    PlaceRef,
    ProviderCapabilities,
    ProviderErrorCode,
    ProviderId,
    ProviderQuote,
    ProviderState,
    ProviderStatus,
    QuoteRequest,
    QuoteSource,
    QuoteStatus,
    RideCategory,
)
from app.services.fares.providers import DemoAdapter

REQUEST = QuoteRequest(
    pickup=PlaceRef(id="hitech-city", name="Hitech City", address="Madhapur"),
    destination=PlaceRef(id="airport", name="Airport", address="Shamshabad"),
)


def make_quote(
    provider: ProviderId,
    category: RideCategory = RideCategory.BIKE,
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
    """Programmable adapter: can be slow, fail, or wait at a barrier."""

    source = QuoteSource.PROVIDER_API

    def __init__(
        self,
        name: str,
        quotes: Sequence[ProviderQuote] = (),
        *,
        providers: tuple[ProviderId, ...],
        error: BaseException | None = None,
        delay: float = 0.0,
        barrier: asyncio.Barrier | None = None,
        cancelled: asyncio.Event | None = None,
    ) -> None:
        self.name = name
        self.quotes = tuple(quotes)
        self.providers = providers
        self.capabilities = ProviderCapabilities(
            providers=providers,
            categories=None,
            coordinates_required=None,
            credentials_required=None,
            expiry_supported=None,
        )
        self.error = error
        self.delay = delay
        self.barrier = barrier
        self.cancelled = cancelled

    async def compare(self, request: QuoteRequest) -> Sequence[ProviderQuote]:
        try:
            if self.barrier is not None:
                # Sequential calls would never fill the barrier and would time
                # out, so this proves the fan-out is concurrent.
                await asyncio.wait_for(self.barrier.wait(), timeout=1.0)

            if self.delay:
                await asyncio.sleep(self.delay)

            if self.error is not None:
                raise self.error

            return self.quotes
        except asyncio.CancelledError:
            if self.cancelled is not None:
                self.cancelled.set()
            raise


def states_by_provider(
    comparison: FareComparison,
) -> dict[ProviderId, ProviderState]:
    return {state.provider: state for state in comparison.provider_states}


def test_one_provider_fails_and_the_others_still_quote() -> None:
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(
                "rapido",
                [make_quote(ProviderId.RAPIDO)],
                providers=(ProviderId.RAPIDO,),
            ),
            FakeAdapter(
                "uber",
                providers=(ProviderId.UBER,),
                error=RuntimeError("provider exploded"),
            ),
        )
    )

    comparison = asyncio.run(aggregator.compare(REQUEST))

    assert [quote.provider for quote in comparison.quotes] == [ProviderId.RAPIDO]
    states = states_by_provider(comparison)
    assert states[ProviderId.RAPIDO].status is ProviderStatus.SUCCESS
    assert states[ProviderId.UBER].status is ProviderStatus.FAILED
    assert states[ProviderId.UBER].error_code is ProviderErrorCode.PROVIDER_ERROR


def test_one_provider_times_out_and_the_other_still_quotes() -> None:
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(
                "rapido",
                [make_quote(ProviderId.RAPIDO)],
                providers=(ProviderId.RAPIDO,),
            ),
            FakeAdapter("ola", providers=(ProviderId.OLA,), delay=1.0),
        ),
        request_timeout_seconds=0.05,
        total_budget_seconds=2.0,
    )

    comparison = asyncio.run(aggregator.compare(REQUEST))

    assert [quote.provider for quote in comparison.quotes] == [ProviderId.RAPIDO]
    states = states_by_provider(comparison)
    assert states[ProviderId.OLA].status is ProviderStatus.TIMED_OUT
    assert states[ProviderId.OLA].error_code is ProviderErrorCode.TIMEOUT


def test_all_providers_failing_returns_no_quotes() -> None:
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(
                "rapido", providers=(ProviderId.RAPIDO,), error=RuntimeError("nope")
            ),
            FakeAdapter(
                "uber", providers=(ProviderId.UBER,), error=RuntimeError("nope")
            ),
        )
    )

    comparison = asyncio.run(aggregator.compare(REQUEST))

    assert comparison.quotes == ()
    assert comparison.source is QuoteSource.PROVIDER_API
    assert {state.status for state in comparison.provider_states} == {
        ProviderStatus.FAILED
    }


def test_total_budget_cancels_lingering_providers() -> None:
    cancelled = asyncio.Event()
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(
                "rapido", providers=(ProviderId.RAPIDO,), delay=1.0, cancelled=cancelled
            ),
            FakeAdapter("uber", providers=(ProviderId.UBER,), delay=1.0),
        ),
        request_timeout_seconds=10.0,
        total_budget_seconds=0.05,
    )

    comparison = asyncio.run(aggregator.compare(REQUEST))

    assert comparison.quotes == ()
    assert {state.status for state in comparison.provider_states} == {
        ProviderStatus.TIMED_OUT
    }
    assert {
        state.error_code for state in comparison.provider_states
    } == {ProviderErrorCode.TOTAL_BUDGET_EXCEEDED}
    # The slow call was actually cancelled, not left running behind the response.
    assert cancelled.is_set()


def test_providers_are_called_concurrently() -> None:
    barrier = asyncio.Barrier(2)
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(
                "rapido",
                [make_quote(ProviderId.RAPIDO)],
                providers=(ProviderId.RAPIDO,),
                barrier=barrier,
            ),
            FakeAdapter(
                "uber",
                [make_quote(ProviderId.UBER)],
                providers=(ProviderId.UBER,),
                barrier=barrier,
            ),
        ),
        request_timeout_seconds=1.0,
        total_budget_seconds=2.0,
    )

    comparison = asyncio.run(aggregator.compare(REQUEST))

    assert {state.status for state in comparison.provider_states} == {
        ProviderStatus.SUCCESS
    }
    assert len(comparison.quotes) == 2


def test_unsupported_category_is_a_quote_not_a_failure() -> None:
    unsupported = ProviderQuote(
        provider=ProviderId.RAPIDO,
        category=RideCategory.CAB,
        tier_label="Cab",
        fare=190,
        currency="INR",
        eta_minutes=6,
        available=False,
        status=QuoteStatus.UNSUPPORTED,
    )
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter("rapido", [unsupported], providers=(ProviderId.RAPIDO,)),
        )
    )

    comparison = asyncio.run(aggregator.compare(REQUEST))

    state = comparison.provider_states[0]
    assert state.status is ProviderStatus.SUCCESS
    assert state.error_code is None
    assert comparison.quotes[0].status is QuoteStatus.UNSUPPORTED
    assert comparison.quotes[0].available is False


def test_latency_is_a_non_negative_integer() -> None:
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(
                "rapido",
                [make_quote(ProviderId.RAPIDO)],
                providers=(ProviderId.RAPIDO,),
            ),
            FakeAdapter("uber", providers=(ProviderId.UBER,), error=RuntimeError()),
        )
    )

    comparison = asyncio.run(aggregator.compare(REQUEST))

    for state in comparison.provider_states:
        assert isinstance(state.latency_ms, int)
        assert state.latency_ms >= 0


def test_states_follow_response_order_not_completion_or_call_order() -> None:
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(
                "ola", [make_quote(ProviderId.OLA)], providers=(ProviderId.OLA,)
            ),
            FakeAdapter(
                "rapido",
                [make_quote(ProviderId.RAPIDO)],
                providers=(ProviderId.RAPIDO,),
            ),
            FakeAdapter(
                "uber", [make_quote(ProviderId.UBER)], providers=(ProviderId.UBER,)
            ),
        )
    )

    comparison = asyncio.run(aggregator.compare(REQUEST))

    assert [state.provider for state in comparison.provider_states] == list(
        PROVIDER_ORDER
    )
    assert [quote.provider for quote in comparison.quotes] == list(PROVIDER_ORDER)


def test_demo_mode_still_reports_every_provider() -> None:
    aggregator = FareAggregator(adapters=(DemoAdapter(),))

    comparison = asyncio.run(aggregator.compare(REQUEST))

    assert comparison.source is QuoteSource.DEMO
    assert len(comparison.quotes) == 9
    assert {state.provider for state in comparison.provider_states} == set(
        PROVIDER_ORDER
    )
    assert {state.status for state in comparison.provider_states} == {
        ProviderStatus.SUCCESS
    }


def test_exception_text_never_reaches_the_comparison() -> None:
    secret = "sk-live-should-never-appear"
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(
                "uber",
                providers=(ProviderId.UBER,),
                error=RuntimeError(f"auth failed for {secret}"),
            ),
        )
    )

    comparison = asyncio.run(aggregator.compare(REQUEST))

    assert secret not in repr(comparison)
    assert secret not in repr(comparison.provider_states)


def test_caller_cancellation_cancels_provider_calls() -> None:
    async def scenario() -> None:
        cancelled = asyncio.Event()
        aggregator = FareAggregator(
            adapters=(
                FakeAdapter(
                    "uber",
                    providers=(ProviderId.UBER,),
                    delay=5.0,
                    cancelled=cancelled,
                ),
            ),
            request_timeout_seconds=10.0,
            total_budget_seconds=10.0,
        )

        task = asyncio.create_task(aggregator.compare(REQUEST))
        await asyncio.sleep(0.05)
        task.cancel()

        with pytest.raises(asyncio.CancelledError):
            await task

        assert cancelled.is_set()

    asyncio.run(scenario())


@pytest.mark.parametrize(
    ("request_timeout", "budget"),
    [(0, 1), (-1, 1), (1, 0), (1, -1)],
)
def test_timeouts_must_be_positive(request_timeout: float, budget: float) -> None:
    with pytest.raises(ValueError):
        FareAggregator(
            adapters=(DemoAdapter(),),
            request_timeout_seconds=request_timeout,
            total_budget_seconds=budget,
        )
