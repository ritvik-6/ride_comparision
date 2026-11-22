"""Tests for pricing demo estimates from a measured road route.

The app sends the route it calculated on the map, so these estimates follow a
distance and a driving time instead of the place ids. The id-based path must stay
exactly as it was, because older clients still use it and the parity fixture
covers it.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services.fares import (
    DEMO_ESTIMATES_NOTICE,
    RouteMetrics,
    get_demo_fare_comparison,
)
from app.schemas.fares import FareCompareRequest

ENDPOINT = "/api/v1/fares/compare"

PICKUP = {
    "id": "hitech-city",
    "name": "Hitech City",
    "address": "HITEC City, Madhapur, Hyderabad",
    "coordinates": {"latitude": 17.4435, "longitude": 78.3772},
}

DESTINATION = {
    "id": "airport",
    "name": "Rajiv Gandhi International Airport",
    "address": "Shamshabad, Hyderabad",
    "coordinates": {"latitude": 17.2403, "longitude": 78.4294},
}


def make_client() -> TestClient:
    return TestClient(create_app())


def make_payload(route: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"pickup": PICKUP, "destination": DESTINATION}

    if route is not None:
        payload["route"] = route

    return payload


def estimates_by_id(distance_km: float, duration_minutes: float) -> dict[str, Any]:
    return {
        estimate.id: estimate
        for estimate in get_demo_fare_comparison(
            "hitech-city",
            "airport",
            route_distance_km=distance_km,
            route_duration_minutes=duration_minutes,
        )
    }


# --- route-priced estimates -------------------------------------------------


def test_route_pricing_is_still_sample_data() -> None:
    """A measured distance must not turn demo numbers into "live" ones."""

    estimates = get_demo_fare_comparison(
        "a",
        "b",
        route_distance_km=12.4,
        route_duration_minutes=28,
    )

    for estimate in estimates:
        assert estimate.currency == "INR"
        assert estimate.fare > 0
        assert estimate.fare % 5 == 0


def test_route_pricing_covers_every_provider_and_category() -> None:
    estimates = get_demo_fare_comparison(
        "a",
        "b",
        route_distance_km=12.4,
        route_duration_minutes=28,
    )

    assert [(estimate.provider, estimate.category) for estimate in estimates] == [
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
    # The unavailable Rapido cab is preserved, not dropped or made available.
    assert [estimate.id for estimate in estimates if not estimate.available] == [
        "rapido-cab"
    ]


def test_longer_distance_costs_more_for_the_same_tier() -> None:
    short = estimates_by_id(5.0, 15)
    long = estimates_by_id(22.0, 40)

    for tier in ("rapido-bike", "uber-auto", "ola-cab"):
        assert long[tier].fare > short[tier].fare


def test_longer_driving_time_pushes_the_wait_up() -> None:
    quick = estimates_by_id(12.4, 8)
    slow = estimates_by_id(12.4, 70)

    assert slow["uber-cab"].eta_minutes > quick["uber-cab"].eta_minutes
    # The wait is capped, so an absurd duration cannot invent a huge ETA.
    assert slow["uber-cab"].eta_minutes <= estimates_by_id(12.4, 10_000)[
        "uber-cab"
    ].eta_minutes


def test_same_route_gives_the_same_estimates() -> None:
    assert estimates_by_id(9.8, 24) == estimates_by_id(9.8, 24)


def test_route_pricing_ignores_the_place_ids() -> None:
    """With a measured route, two different ids for that route agree."""

    via_ids = get_demo_fare_comparison(
        "hitech-city",
        "airport",
        route_distance_km=9.8,
        route_duration_minutes=24,
    )
    via_other_ids = get_demo_fare_comparison(
        "begumpet",
        "charminar",
        route_distance_km=9.8,
        route_duration_minutes=24,
    )

    assert via_ids == via_other_ids


def test_without_a_route_the_id_based_path_is_unchanged() -> None:
    """The previous payload is still served byte for byte."""

    assert get_demo_fare_comparison("hitech-city", "airport") == get_demo_fare_comparison(
        "hitech-city", "airport", route_distance_km=None, route_duration_minutes=None
    )
    assert get_demo_fare_comparison("hitech-city", "airport") != get_demo_fare_comparison(
        "hitech-city",
        "airport",
        route_distance_km=9.8,
        route_duration_minutes=24,
    )


# --- domain validation ------------------------------------------------------


@pytest.mark.parametrize(
    ("distance_km", "duration_minutes"),
    [(0, 20), (-1, 20), (501, 20), (10, 0), (10, -5), (10, 1_441)],
)
def test_implausible_route_metrics_are_rejected(
    distance_km: float, duration_minutes: float
) -> None:
    with pytest.raises(ValueError):
        RouteMetrics(distance_km=distance_km, duration_minutes=duration_minutes)


def test_non_finite_route_metrics_are_rejected() -> None:
    with pytest.raises(ValueError):
        RouteMetrics(distance_km=float("nan"), duration_minutes=20)


# --- API contract -----------------------------------------------------------


def test_api_accepts_a_route_and_prices_the_estimates() -> None:
    response = make_client().post(
        ENDPOINT,
        json=make_payload({"distanceKm": 12.4, "durationMinutes": 28}),
    )

    assert response.status_code == 200

    body = response.json()

    assert body["source"] == "demo"
    assert body["notice"] == DEMO_ESTIMATES_NOTICE
    assert len(body["estimates"]) == 9
    # The response contract is unchanged: no route echo was added.
    assert "route" not in body


def test_api_route_changes_the_fare_compared_with_the_id_only_path() -> None:
    client = make_client()

    without = client.post(ENDPOINT, json=make_payload()).json()["estimates"]
    with_route = client.post(
        ENDPOINT,
        json=make_payload({"distanceKm": 30.0, "durationMinutes": 55}),
    ).json()["estimates"]

    assert without != with_route
    assert [row["id"] for row in without] == [row["id"] for row in with_route]


@pytest.mark.parametrize(
    "route",
    [
        {"distanceKm": 0, "durationMinutes": 20},
        {"distanceKm": -4, "durationMinutes": 20},
        {"distanceKm": 600, "durationMinutes": 20},
        {"distanceKm": 10, "durationMinutes": 0},
        {"distanceKm": 10, "durationMinutes": 5_000},
        {"distanceKm": 10},
        {"durationMinutes": 20},
        {"distanceKm": "far", "durationMinutes": 20},
    ],
)
def test_api_rejects_invalid_route_metrics(route: dict[str, Any]) -> None:
    response = make_client().post(ENDPOINT, json=make_payload(route))

    assert response.status_code == 422


def test_api_ignores_an_explicit_null_route() -> None:
    response = make_client().post(ENDPOINT, json=make_payload({"distanceKm": None}))

    assert response.status_code == 422

    legacy = make_client().post(ENDPOINT, json={**make_payload(), "route": None})

    assert legacy.status_code == 200
    assert legacy.json()["estimates"] == make_client().post(
        ENDPOINT, json=make_payload()
    ).json()["estimates"]


def test_request_schema_parses_camel_case_route() -> None:
    payload = FareCompareRequest.model_validate(make_payload(
        {"distanceKm": 8.5, "durationMinutes": 21}
    ))

    assert payload.route is not None
    assert payload.route.distance_km == 8.5
    assert payload.route.duration_minutes == 21
