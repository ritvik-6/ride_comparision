"""Deterministic demo fare estimates.

The id-based path is a line-for-line port of ``src/services/fares/demoFares.ts``
in the mobile app, so a route produces the same numbers on the server as it does
on the device. When the app supplies a measured road route, the same offer table
is priced from that distance and duration instead.

Either way this is *sample data*: no provider is called, the rates are
illustrative, and nothing here is a live quote.

Two JavaScript behaviours have to be reproduced exactly, or the two
implementations drift apart on some routes:

* ``stableHash`` uses FNV-1a over a JavaScript string. ``charCodeAt`` yields
  UTF-16 code units (so an emoji outside the BMP is two units, not one), and
  ``^=``/``Math.imul`` operate on signed 32-bit integers, with ``>>> 0``
  returning the unsigned result. Python integers are unbounded, so every step is
  explicitly wrapped to 32 bits.
* ``Math.round`` rounds halves towards positive infinity, while Python's
  ``round`` is half-to-even. ``_js_round`` therefore uses ``floor(x + 0.5)``.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Final

CURRENCY: Final = "INR"

#: Where these estimates came from. Never a live provider quote.
DEMO_SOURCE: Final = "demo"

#: Copy shown next to demo estimates, matching the mobile app.
DEMO_ESTIMATES_NOTICE: Final = (
    "Fares and ETAs are sample data for this build. "
    "They are not live prices from Rapido, Uber or Ola."
)

_FNV_OFFSET_BASIS: Final = 0x811C9DC5
_FNV_PRIME: Final = 0x01000193
_UINT32_MASK: Final = 0xFFFFFFFF
_INT32_SIGN: Final = 0x80000000
_INT32_WRAP: Final = 0x100000000

_FARE_FACTOR_BASE: Final = 0.92
_FARE_FACTOR_STEPS: Final = 21
_ETA_OFFSET_STEPS: Final = 4
_FARE_GRANULARITY: Final = 5

#: Sample per-kilometre rates used when the app supplies a measured road route.
#: These are illustrative numbers for the demo build, not any provider's tariff.
_ROUTE_RATE_PER_KM: Final = {"bike": 8.0, "auto": 13.0, "cab": 21.0}

#: Sample flag-fall for each tier, so a very short trip is still sensible.
_ROUTE_BASE_FARE: Final = {"bike": 15.0, "auto": 25.0, "cab": 45.0}

#: Sample provider positioning. Not verified pricing: every adapter here is demo.
_ROUTE_PROVIDER_FACTOR: Final = {"rapido": 0.94, "uber": 1.06, "ola": 1.0}

#: Extra sample pickup wait per this many minutes of driving time.
_ROUTE_WAIT_STEP_MINUTES: Final = 15
_ROUTE_WAIT_STEP_CAP: Final = 4


@dataclass(frozen=True, slots=True)
class DemoOffer:
    """One hand-written sample tier before route variation is applied."""

    provider: str
    category: str
    tier_label: str
    base_fare: int
    base_eta_minutes: int
    available: bool


#: Mirrors ``DEMO_OFFERS`` in the app, including the unavailable Rapido cab.
DEMO_OFFERS: Final[tuple[DemoOffer, ...]] = (
    DemoOffer("rapido", "bike", "Bike", 45, 2, True),
    DemoOffer("rapido", "auto", "Auto", 85, 4, True),
    DemoOffer("rapido", "cab", "Cab", 190, 6, False),
    DemoOffer("uber", "bike", "Moto", 52, 3, True),
    DemoOffer("uber", "auto", "Auto", 95, 5, True),
    DemoOffer("uber", "cab", "Go", 210, 7, True),
    DemoOffer("ola", "bike", "Bike", 49, 3, True),
    DemoOffer("ola", "auto", "Auto", 90, 5, True),
    DemoOffer("ola", "cab", "Mini", 205, 8, True),
)


@dataclass(frozen=True, slots=True)
class DemoFareEstimate:
    """One provider/tier estimate for a route."""

    id: str
    provider: str
    category: str
    tier_label: str
    fare: int
    currency: str
    eta_minutes: int
    available: bool


def _to_int32(value: int) -> int:
    """Wrap ``value`` to a signed 32-bit integer, as JavaScript's bitwise ops do."""

    wrapped = value & _UINT32_MASK
    return wrapped - _INT32_WRAP if wrapped >= _INT32_SIGN else wrapped


def _utf16_code_units(value: str) -> tuple[int, ...]:
    """Split ``value`` the way JavaScript indexes strings.

    ``str`` iterates code points; JavaScript indexes UTF-16 code units. Encoding
    to UTF-16 keeps astral characters (emoji, rare CJK) as the surrogate pairs
    that ``charCodeAt`` would report. ``surrogatepass`` keeps lone surrogates
    hashable instead of raising.
    """

    encoded = value.encode("utf-16-le", errors="surrogatepass")

    return tuple(
        int.from_bytes(encoded[index : index + 2], "little")
        for index in range(0, len(encoded), 2)
    )


def stable_hash(value: str) -> int:
    """FNV-1a over UTF-16 code units, returning an unsigned 32-bit integer."""

    hash_value = _FNV_OFFSET_BASIS

    for code_unit in _utf16_code_units(value):
        hash_value = _to_int32(hash_value ^ code_unit)
        hash_value = _to_int32(hash_value * _FNV_PRIME)

    return hash_value & _UINT32_MASK


def _js_round(value: float) -> int:
    """``Math.round`` semantics: halves round towards positive infinity."""

    return math.floor(value + 0.5)


def _round_to_five(value: float) -> int:
    return _js_round(value / _FARE_GRANULARITY) * _FARE_GRANULARITY


def _route_seed(pickup_id: str, destination_id: str) -> int:
    return stable_hash(f"{pickup_id}->{destination_id}")


def _id_variation(pickup_id: str, destination_id: str) -> tuple[float, int]:
    """Sample variation spread by the route's ids.

    Used when the client has no measured route. The ids only spread the sample
    numbers so two routes do not look identical; nothing is measured.
    """

    seed = _route_seed(pickup_id, destination_id)

    return _FARE_FACTOR_BASE + (seed % _FARE_FACTOR_STEPS) / 100, seed % _ETA_OFFSET_STEPS


def _estimate_from_route(
    offer: DemoOffer,
    distance_km: float,
    duration_minutes: float,
) -> DemoFareEstimate:
    """Price one tier from a measured road route.

    The fare grows with the driving distance and the pickup wait grows with the
    driving time, so a longer trip is visibly more expensive and slower to reach
    than a short one. Every number is still sample data: no provider is called,
    and the rates above are illustrative rather than anyone's tariff.
    """

    distance_component = (
        _ROUTE_BASE_FARE[offer.category]
        + _ROUTE_RATE_PER_KM[offer.category] * distance_km
    )
    fare = distance_component * _ROUTE_PROVIDER_FACTOR[offer.provider]

    extra_wait = min(
        int(duration_minutes // _ROUTE_WAIT_STEP_MINUTES),
        _ROUTE_WAIT_STEP_CAP,
    )

    return DemoFareEstimate(
        id=f"{offer.provider}-{offer.category}",
        provider=offer.provider,
        category=offer.category,
        tier_label=offer.tier_label,
        fare=_round_to_five(fare),
        currency=CURRENCY,
        eta_minutes=offer.base_eta_minutes + extra_wait,
        available=offer.available,
    )


def get_demo_fare_comparison(
    pickup_id: str,
    destination_id: str,
    route_distance_km: float | None = None,
    route_duration_minutes: float | None = None,
) -> tuple[DemoFareEstimate, ...]:
    """Build the demo comparison for one route.

    Two inputs are supported, and they never mix:

    * With a measured road route (both metrics present), fares derive from the
      distance and waits from the duration. Results are deterministic for the
      same route because the arithmetic is.
    * Without one, the previous id-based sample variation is used unchanged, so
      an older client keeps getting exactly the same payload it always did.

    Availability always comes from the static offer table, never from a lookup.
    """

    has_route = route_distance_km is not None and route_duration_minutes is not None

    if has_route:
        return tuple(
            _estimate_from_route(
                offer,
                float(route_distance_km),
                float(route_duration_minutes),
            )
            for offer in DEMO_OFFERS
        )

    fare_factor, eta_offset = _id_variation(pickup_id, destination_id)

    return tuple(
        DemoFareEstimate(
            id=f"{offer.provider}-{offer.category}",
            provider=offer.provider,
            category=offer.category,
            tier_label=offer.tier_label,
            fare=_round_to_five(offer.base_fare * fare_factor),
            currency=CURRENCY,
            eta_minutes=offer.base_eta_minutes + eta_offset,
            available=offer.available,
        )
        for offer in DEMO_OFFERS
    )
