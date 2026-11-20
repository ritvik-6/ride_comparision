"""The contract every fare provider adapter implements.

An adapter's whole job is to turn a :class:`QuoteRequest` into domain quotes.
Everything else — which adapters run, in what order results appear, what the
response says about its source — belongs to the aggregator.

Rules an implementation must follow:

* Return quotes only for categories the request asked for, and only for tiers
  the provider actually describes. Never invent a tier name or a price.
* Report "this provider does not serve this tier here" as a
  :class:`QuoteStatus` ``UNSUPPORTED`` quote, not as an exception.
* Do not mutate the request or share mutable state between calls.
* Keep FastAPI, HTTP status codes and wire field names out of the adapter.
* Never include credentials, provider response bodies or a raw exception
  message in an exception the caller can see: the aggregator turns failures
  into an enumerated status, and everything else is dropped.
"""

from __future__ import annotations

from typing import Protocol, Sequence

from app.services.fares.models import (
    ProviderCapabilities,
    ProviderId,
    ProviderQuote,
    QuoteRequest,
    QuoteSource,
    QuoteStatus,
)


class ProviderNotConfiguredError(RuntimeError):
    """An adapter cannot quote because its integration is not configured.

    Raised instead of returning a made-up quote, so a half-finished provider can
    never look like a real price. The carried status is the provider-level state
    the aggregator reports once per-provider states exist.
    """

    status = QuoteStatus.NOT_CONFIGURED

    def __init__(self, provider: ProviderId, message: str) -> None:
        super().__init__(message)
        self.provider = provider


class FareProviderAdapter(Protocol):
    """Structural contract for a fare source.

    Declared as a ``Protocol`` so adapters can be plain classes (and fakes in
    tests can be plain classes too) without inheriting from a base class. A
    shared HTTP base class can be added alongside the first real adapter without
    changing this contract.
    """

    #: Stable short identifier used in logs and diagnostics, e.g. "demo".
    name: str

    #: Provenance of everything this adapter returns.
    source: QuoteSource

    #: Providers this adapter can speak for. One entry for an authorised
    #: integration; the demo adapter covers all three, which is why provider
    #: states name a provider rather than an adapter.
    providers: tuple[ProviderId, ...]

    #: What this integration is known to support. Must agree with
    #: ``providers``; unverified values are ``None``, never a guess.
    capabilities: ProviderCapabilities

    async def compare(self, request: QuoteRequest) -> Sequence[ProviderQuote]:
        """Return this source's quotes for ``request``.

        Async because authorised providers are network calls. Implementations
        must not block the event loop, and must raise only for genuine bugs:
        expected failures are represented in the returned quotes.
        """
        ...
