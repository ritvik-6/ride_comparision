"""Runs the provider adapters and assembles one comparison.

The aggregator owns everything that is true of the *comparison* rather than of a
single provider: which adapters run, how long they get, the order results appear
in, and what the response claims about its own source.

Failure policy. Providers are called concurrently, each inside a per-provider
timeout, with a ceiling on the whole comparison. A provider that raises, hangs or
is not configured becomes a :class:`ProviderState`; it never removes another
provider's quotes and it never truncates the request. There is no fallback to
demo data: inventing a price for a provider that failed would be worse than
showing that it failed.

Error policy. Adapter exceptions are caught and discarded here. Only an
enumerated :class:`ProviderErrorCode` ever travels further, so a credential, a
provider response body or an internal message cannot reach a client.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, replace
from typing import Iterable, Sequence

from app.services.fares.models import (
    CATEGORY_ORDER,
    PROVIDER_ORDER,
    FareComparison,
    ProviderErrorCode,
    ProviderQuote,
    ProviderState,
    ProviderStatus,
    QuoteRequest,
    QuoteSource,
)
from app.services.fares.providers.base import (
    FareProviderAdapter,
    ProviderNotConfiguredError,
)

#: Mirror the configuration defaults in ``app.core.config``.
DEFAULT_REQUEST_TIMEOUT_SECONDS = 4.0
DEFAULT_TOTAL_BUDGET_SECONDS = 6.0


class MixedQuoteSourcesError(ValueError):
    """Raised when adapters in one aggregator disagree about provenance.

    Demo and live numbers must never share a response: a sorted list mixing the
    two would let a badge compare a sample fare against a real quote. Supporting
    that needs per-quote provenance and a distinguishing source, so it is
    rejected outright instead of being merged by accident.
    """


def order_quotes(quotes: Iterable[ProviderQuote]) -> tuple[ProviderQuote, ...]:
    """Sort quotes into the API's stable provider-then-category order.

    ``sorted`` is stable, so quotes that share a key keep the order their
    adapter returned them in.
    """

    provider_rank = {provider: index for index, provider in enumerate(PROVIDER_ORDER)}
    category_rank = {category: index for index, category in enumerate(CATEGORY_ORDER)}
    provider_tail = len(PROVIDER_ORDER)
    category_tail = len(CATEGORY_ORDER)

    return tuple(
        sorted(
            quotes,
            key=lambda quote: (
                provider_rank.get(quote.provider, provider_tail),
                category_rank.get(quote.category, category_tail),
            ),
        )
    )


def order_provider_states(
    states: Iterable[ProviderState],
) -> tuple[ProviderState, ...]:
    """Sort provider states into response order, independently of completion."""

    provider_rank = {provider: index for index, provider in enumerate(PROVIDER_ORDER)}
    provider_tail = len(PROVIDER_ORDER)

    return tuple(
        sorted(
            states,
            key=lambda state: provider_rank.get(state.provider, provider_tail),
        )
    )


@dataclass(frozen=True, slots=True)
class ProviderCallResult:
    """What one adapter call produced, success or not."""

    quotes: tuple[ProviderQuote, ...]
    status: ProviderStatus
    latency_ms: int
    error_code: ProviderErrorCode | None = None


def _elapsed_ms(started: float) -> int:
    return max(0, round((time.perf_counter() - started) * 1000))


def _has_coordinates(request: QuoteRequest) -> bool:
    """True only when both ends of the trip have a position."""

    return (
        request.pickup.coordinates is not None
        and request.destination.coordinates is not None
    )


class FareAggregator:
    """Concurrent fan-out over the injected adapters.

    Adapters are passed in rather than constructed here, so a test can supply
    fakes and a deployment can choose a different set without touching this
    class. The instance is stateless and safe to reuse across requests.
    """

    def __init__(
        self,
        adapters: Sequence[FareProviderAdapter],
        *,
        request_timeout_seconds: float = DEFAULT_REQUEST_TIMEOUT_SECONDS,
        total_budget_seconds: float = DEFAULT_TOTAL_BUDGET_SECONDS,
    ) -> None:
        collected = tuple(adapters)

        if not collected:
            raise ValueError("FareAggregator needs at least one adapter")

        if request_timeout_seconds <= 0:
            raise ValueError("request_timeout_seconds must be positive")

        if total_budget_seconds <= 0:
            raise ValueError("total_budget_seconds must be positive")

        for adapter in collected:
            # Two declarations of the same fact drift; refuse the mismatch rather
            # than reporting states for providers the adapter cannot name.
            if adapter.capabilities.providers != adapter.providers:
                raise ValueError(
                    f"adapter {adapter.name!r} declares providers "
                    f"{adapter.providers} but capabilities for "
                    f"{adapter.capabilities.providers}"
                )

        self._adapters = collected
        self._request_timeout = request_timeout_seconds
        self._total_budget = total_budget_seconds

    @property
    def adapters(self) -> tuple[FareProviderAdapter, ...]:
        """The adapters this aggregator will call, in call order."""

        return self._adapters

    @property
    def request_timeout_seconds(self) -> float:
        return self._request_timeout

    @property
    def total_budget_seconds(self) -> float:
        return self._total_budget

    @property
    def source(self) -> QuoteSource:
        """The provenance every adapter in this aggregator shares."""

        return self._shared_source()

    async def compare(self, request: QuoteRequest) -> FareComparison:
        """Ask every adapter and return one ordered comparison.

        Never raises for a provider problem: a timeout, a crash, a missing
        configuration, or a request the provider's declared capabilities cannot
        answer all become states on the returned comparison.
        """

        source = self._shared_source()
        started = time.perf_counter()

        calls: list[tuple[int, asyncio.Task[ProviderCallResult]]] = []
        outcomes: dict[int, ProviderCallResult] = {}

        for index, adapter in enumerate(self._adapters):
            # Capabilities are applied before anything is called: a provider
            # that cannot answer this request is skipped and reported as
            # unsupported, not asked and counted as a failure.
            planned, skipped = self._plan(adapter, request)

            if skipped is not None:
                outcomes[index] = skipped
            else:
                calls.append(
                    (index, asyncio.create_task(self._call(adapter, planned)))
                )

        if calls:
            try:
                _done, pending = await asyncio.wait(
                    {task for _, task in calls},
                    timeout=self._total_budget,
                )
            except asyncio.CancelledError:
                # The client went away (or the server is shutting down): do not
                # leave provider calls running behind the cancelled request.
                for _, task in calls:
                    task.cancel()
                await asyncio.gather(
                    *(task for _, task in calls), return_exceptions=True
                )
                raise

            for index, task in calls:
                if task in pending:
                    task.cancel()
                    outcomes[index] = ProviderCallResult(
                        quotes=(),
                        status=ProviderStatus.TIMED_OUT,
                        latency_ms=_elapsed_ms(started),
                        error_code=ProviderErrorCode.TOTAL_BUDGET_EXCEEDED,
                    )
                else:
                    outcomes[index] = task.result()

            if pending:
                # Let the cancelled calls unwind; their outcome is already
                # recorded above, so nothing here is read.
                await asyncio.gather(*pending, return_exceptions=True)

        results = [outcomes[index] for index in range(len(self._adapters))]

        states = order_provider_states(
            ProviderState(
                provider=provider,
                status=result.status,
                latency_ms=result.latency_ms,
                error_code=result.error_code,
            )
            for adapter, result in zip(self._adapters, results)
            for provider in adapter.providers
        )

        return FareComparison(
            source=source,
            quotes=order_quotes(quote for result in results for quote in result.quotes),
            provider_states=states,
        )

    def _plan(
        self,
        adapter: FareProviderAdapter,
        request: QuoteRequest,
    ) -> tuple[QuoteRequest, ProviderCallResult | None]:
        """Narrow the request to what the adapter declares, or skip it.

        Returns the request to send, plus the state that stands in for the call
        when the adapter should not be asked at all. Unverified capabilities
        (``None``) never narrow and never skip: absence of evidence is not a
        reason to drop a provider.
        """

        capabilities = adapter.capabilities
        categories = request.categories

        if capabilities.categories is not None:
            categories = tuple(
                category
                for category in categories
                if category in capabilities.categories
            )

            if not categories:
                return request, ProviderCallResult(
                    quotes=(),
                    status=ProviderStatus.UNSUPPORTED,
                    latency_ms=0,
                )

        if capabilities.coordinates_required is True and not _has_coordinates(
            request
        ):
            return request, ProviderCallResult(
                quotes=(),
                status=ProviderStatus.UNSUPPORTED,
                latency_ms=0,
                error_code=ProviderErrorCode.MISSING_COORDINATES,
            )

        if categories == request.categories:
            return request, None

        return replace(request, categories=categories), None

    async def _call(
        self,
        adapter: FareProviderAdapter,
        request: QuoteRequest,
    ) -> ProviderCallResult:
        """Run one adapter, converting every failure into a state."""

        started = time.perf_counter()

        try:
            async with asyncio.timeout(self._request_timeout):
                quotes = tuple(await adapter.compare(request))
        except ProviderNotConfiguredError:
            # An expected outcome: the integration exists but has no usable
            # configuration. The message is not reused, only the status.
            return ProviderCallResult(
                quotes=(),
                status=ProviderStatus.NOT_CONFIGURED,
                latency_ms=_elapsed_ms(started),
            )
        except TimeoutError:
            return ProviderCallResult(
                quotes=(),
                status=ProviderStatus.TIMED_OUT,
                latency_ms=_elapsed_ms(started),
                error_code=ProviderErrorCode.TIMEOUT,
            )
        except Exception:
            # Deliberately swallowed and *not* logged with its message here: a
            # provider error may embed a token or a response body. The caller
            # only ever sees the enumerated code.
            return ProviderCallResult(
                quotes=(),
                status=ProviderStatus.FAILED,
                latency_ms=_elapsed_ms(started),
                error_code=ProviderErrorCode.PROVIDER_ERROR,
            )

        return ProviderCallResult(
            quotes=quotes,
            status=ProviderStatus.SUCCESS,
            latency_ms=_elapsed_ms(started),
        )

    def _shared_source(self) -> QuoteSource:
        sources = {adapter.source for adapter in self._adapters}

        if len(sources) != 1:
            names = ", ".join(sorted(source.value for source in sources))
            raise MixedQuoteSourcesError(
                "FareAggregator cannot merge adapters with different sources "
                f"({names}); demo and live quotes must be served separately"
            )

        return sources.pop()
