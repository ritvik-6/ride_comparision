"""Unit tests for the demo fare generator.

The expected values in ``fixtures/demo_fares_parity.json`` are produced by
executing the app's own TypeScript module (see the generator next to it), so
these tests prove the Python port agrees with the mobile app rather than with a
second transcription of it.
"""

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

import pytest

from app.services.fares.demo_fares import (
    DEMO_ESTIMATES_NOTICE,
    DEMO_OFFERS,
    DEMO_SOURCE,
    DemoFareEstimate,
    get_demo_fare_comparison,
    stable_hash,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "demo_fares_parity.json"
FIXTURE: dict[str, Any] = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def _to_wire_shape(estimate: DemoFareEstimate) -> dict[str, Any]:
    """Rename snake_case fields to the camelCase the app uses."""

    fields = asdict(estimate)

    return {
        "id": fields["id"],
        "provider": fields["provider"],
        "category": fields["category"],
        "tierLabel": fields["tier_label"],
        "fare": fields["fare"],
        "currency": fields["currency"],
        "etaMinutes": fields["eta_minutes"],
        "available": fields["available"],
    }


@pytest.mark.parametrize(
    "case",
    FIXTURE["hashes"],
    ids=lambda case: f"hash-{case['value'][:16] or 'empty'}",
)
def test_stable_hash_matches_typescript(case: dict[str, Any]) -> None:
    assert stable_hash(case["value"]) == case["hash"]


@pytest.mark.parametrize(
    "route",
    FIXTURE["routes"],
    ids=lambda route: f"{route['pickupId'][:12] or 'empty'}->{route['destinationId'][:12] or 'empty'}",
)
def test_route_estimates_match_typescript(route: dict[str, Any]) -> None:
    seed_input = f"{route['pickupId']}->{route['destinationId']}"

    assert stable_hash(seed_input) == route["seed"]

    estimates = get_demo_fare_comparison(route["pickupId"], route["destinationId"])

    assert [_to_wire_shape(estimate) for estimate in estimates] == route["estimates"]


def test_hash_is_unsigned_32_bit() -> None:
    for value in ("", "a", "🚕", "x" * 500):
        result = stable_hash(value)

        assert isinstance(result, int)
        assert 0 <= result < 2**32


def test_emoji_hashing_is_not_code_point_based() -> None:
    """A surrogate pair must hash as two UTF-16 units, like charCodeAt."""

    # '\ud83d\ude95' is the surrogate pair JavaScript sees for U+1F695.
    assert stable_hash("🚕") == stable_hash("\ud83d\ude95")


def test_comparison_covers_every_provider_and_category() -> None:
    estimates = get_demo_fare_comparison("hitech-city", "airport")

    assert {estimate.provider for estimate in estimates} == {"rapido", "uber", "ola"}
    assert {estimate.category for estimate in estimates} == {"bike", "auto", "cab"}

    for provider in ("rapido", "uber", "ola"):
        categories = {
            estimate.category
            for estimate in estimates
            if estimate.provider == provider
        }
        assert categories == {"bike", "auto", "cab"}


def test_one_estimate_per_offer() -> None:
    estimates = get_demo_fare_comparison("hitech-city", "airport")

    assert len(estimates) == len(DEMO_OFFERS)
    assert [estimate.id for estimate in estimates] == [
        f"{offer.provider}-{offer.category}" for offer in DEMO_OFFERS
    ]


def test_unavailable_offers_are_preserved() -> None:
    estimates = get_demo_fare_comparison("hitech-city", "airport")
    by_id = {estimate.id: estimate for estimate in estimates}

    assert by_id["rapido-cab"].available is False
    assert [estimate.id for estimate in estimates if not estimate.available] == [
        "rapido-cab"
    ]


def test_same_route_is_deterministic() -> None:
    assert get_demo_fare_comparison("madhapur", "airport") == get_demo_fare_comparison(
        "madhapur", "airport"
    )


def test_route_order_matters() -> None:
    assert get_demo_fare_comparison("madhapur", "airport") != get_demo_fare_comparison(
        "airport", "madhapur"
    )


def test_fares_are_whole_rupee_multiples_of_five() -> None:
    for estimate in get_demo_fare_comparison("begumpet", "charminar"):
        assert isinstance(estimate.fare, int)
        assert estimate.fare % 5 == 0
        assert estimate.fare > 0


def test_demo_labels() -> None:
    assert DEMO_SOURCE == "demo"
    assert "sample data" in DEMO_ESTIMATES_NOTICE
    assert "not live prices" in DEMO_ESTIMATES_NOTICE

    # The app's copy says "on this screen"; the API serves clients, so the
    # wording is adjusted while keeping the same disclosure.
    assert FIXTURE["notice"].replace(" on this screen", "") == DEMO_ESTIMATES_NOTICE
