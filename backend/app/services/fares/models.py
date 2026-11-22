"""Domain models for fare comparison.

These types are deliberately free of FastAPI, Pydantic and the API schema. The
provider adapters and the aggregator speak them; only the route layer translates
to and from the wire models. That boundary is the point of the seam: a new
adapter never has to know how a response is serialised, and the route never has
to know how a quote was obtained.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum
from typing import Final


class ProviderId(str, Enum):
    """A ride-hailing provider RideCompare can quote."""

    RAPIDO = "rapido"
    UBER = "uber"
    OLA = "ola"


class RideCategory(str, Enum):
    """Vehicle tiers compared across every provider."""

    BIKE = "bike"
    AUTO = "auto"
    CAB = "cab"


class QuoteSource(str, Enum):
    """Where a set of quotes came from.

    ``DEMO`` is sample data. ``PROVIDER_API`` is reserved for authorised live
    quoting; the wire schema does not accept it yet, so nothing may serve it
    until that schema is widened alongside the first real adapter.
    """

    DEMO = "demo"
    PROVIDER_API = "provider-api"


class QuoteStatus(str, Enum):
    """Why a quote is or is not usable.

    ``UNSUPPORTED`` means the provider does not serve this tier on this route —
    a fact about the provider, not a failure. ``NOT_CONFIGURED`` is a
    provider-level state: the integration has no usable credentials, so it has
    nothing to quote. Transport failures are neither, and are reported as
    :class:`ProviderStatus` instead.
    """

    QUOTED = "quoted"
    UNSUPPORTED = "unsupported"
    NOT_CONFIGURED = "not_configured"


class ProviderStatus(str, Enum):
    """How asking one provider went.

    This is a provider-level result, separate from per-quote
    :class:`QuoteStatus`: a provider can succeed and still report a tier as
    unsupported.

    ``UNSUPPORTED`` means the provider was not asked, because its declared
    capabilities could not answer this request (no requested tier, or missing
    required coordinates). It is a fact about the request, never a failure.
    """

    SUCCESS = "success"
    NOT_CONFIGURED = "not_configured"
    TIMED_OUT = "timed_out"
    FAILED = "failed"
    UNSUPPORTED = "unsupported"


class ProviderErrorCode(str, Enum):
    """Stable, non-sensitive reasons a provider produced no quote.

    These enumerated values are the only error detail allowed to reach a client.
    Provider exception text, response bodies and credentials never cross this
    boundary, so a client cannot be shown a token or a stack trace.
    """

    TIMEOUT = "timeout"
    TOTAL_BUDGET_EXCEEDED = "total_budget_exceeded"
    PROVIDER_ERROR = "provider_error"
    MISSING_COORDINATES = "missing_coordinates"


#: Comparison order used in responses: deterministic, and independent of the
#: order in which adapters happen to answer.
PROVIDER_ORDER: Final[tuple[ProviderId, ...]] = (
    ProviderId.RAPIDO,
    ProviderId.UBER,
    ProviderId.OLA,
)

#: Tier order inside one provider, matching the demo generator's table.
CATEGORY_ORDER: Final[tuple[RideCategory, ...]] = (
    RideCategory.BIKE,
    RideCategory.AUTO,
    RideCategory.CAB,
)


@dataclass(frozen=True, slots=True)
class ProviderCapabilities:
    """What a provider integration can do, as far as we actually know.

    Every field is either a verified fact or ``None``, meaning *unverified*. An
    unverified capability is never used as permission to assume anything: the
    aggregator does not narrow categories it cannot verify, and does not demand
    coordinates a provider may not need.

    ``categories`` distinguishes two very different states: an empty set is
    "verified to serve no tier here", while ``None`` is "we do not know yet".
    Guessing either way would invent a capability.
    """

    providers: tuple[ProviderId, ...]
    categories: frozenset[RideCategory] | None
    credentials_required: bool | None
    coordinates_required: bool | None
    expiry_supported: bool | None

    def __post_init__(self) -> None:
        if not self.providers:
            raise ValueError("ProviderCapabilities needs at least one provider")

        if len(set(self.providers)) != len(self.providers):
            raise ValueError("ProviderCapabilities providers must be unique")

    @property
    def known(self) -> bool:
        """True when the supported tiers are verified rather than unknown."""

        return self.categories is not None

    def supports(self, category: RideCategory) -> bool | None:
        """Whether this integration serves ``category``; ``None`` when unknown."""

        if self.categories is None:
            return None

        return category in self.categories


@dataclass(frozen=True, slots=True)
class GeoPoint:
    """A WGS-84 position supplied by the app."""

    latitude: float
    longitude: float


@dataclass(frozen=True, slots=True)
class PlaceRef:
    """One endpoint of a trip, as selected in the app.

    ``id`` is what the demo generator hashes, so it must be the same value the
    client sent, untouched.
    """

    id: str
    name: str
    address: str
    coordinates: GeoPoint | None = None


@dataclass(frozen=True, slots=True)
class RouteMetrics:
    """Measured road distance and driving time for the requested trip.

    The values come from the app's routing service. They are validated at the
    edge: a non-positive or implausible figure is rejected rather than priced,
    because a made-up distance is exactly what these estimates must not use.
    """

    distance_km: float
    duration_minutes: float

    def __post_init__(self) -> None:
        if not math.isfinite(self.distance_km) or not 0 < self.distance_km <= 500:
            raise ValueError(
                f"distance_km must be finite and within (0, 500] (got {self.distance_km!r})"
            )

        if (
            not math.isfinite(self.duration_minutes)
            or not 0 < self.duration_minutes <= 1_440
        ):
            raise ValueError(
                "duration_minutes must be finite and within (0, 1440] "
                f"(got {self.duration_minutes!r})"
            )


@dataclass(frozen=True, slots=True)
class QuoteRequest:
    """A normalised request handed to every adapter.

    ``categories`` lets an adapter skip tiers it does not care about, and keeps
    the domain able to express a partial comparison later (e.g. one tier only).
    ``route`` carries the measured road metrics when the client has them; adapters
    that cannot use them simply ignore it.
    """

    pickup: PlaceRef
    destination: PlaceRef
    categories: tuple[RideCategory, ...] = CATEGORY_ORDER
    route: RouteMetrics | None = None


@dataclass(frozen=True, slots=True)
class ProviderQuote:
    """One provider/tier offer for a route.

    ``available`` and ``status`` are two views of one fact and are validated
    against each other, so a quote can never claim to be available while
    reporting that the tier is unsupported.
    """

    provider: ProviderId
    category: RideCategory
    tier_label: str
    fare: int
    currency: str
    eta_minutes: int
    available: bool
    status: QuoteStatus

    def __post_init__(self) -> None:
        if self.available != (self.status is QuoteStatus.QUOTED):
            raise ValueError(
                "ProviderQuote.available must be True exactly when status is "
                f"QUOTED (got available={self.available!r}, status={self.status!r})"
            )


@dataclass(frozen=True, slots=True)
class ProviderState:
    """The outcome of asking one provider for quotes.

    ``latency_ms`` is measured locally, so it never reveals anything a provider
    sent. ``error_code`` is enumerated and therefore safe to serialise.
    """

    provider: ProviderId
    status: ProviderStatus
    latency_ms: int
    error_code: ProviderErrorCode | None = None

    def __post_init__(self) -> None:
        if self.latency_ms < 0:
            raise ValueError(f"latency_ms must not be negative (got {self.latency_ms})")

        # An error code explains a failure; attaching one to a success would
        # misreport a working provider.
        if self.status is ProviderStatus.SUCCESS and self.error_code is not None:
            raise ValueError("a successful provider state cannot carry an error code")


@dataclass(frozen=True, slots=True)
class FareComparison:
    """Every quote produced for one route, plus how each provider went."""

    source: QuoteSource
    quotes: tuple[ProviderQuote, ...]
    provider_states: tuple[ProviderState, ...] = ()
