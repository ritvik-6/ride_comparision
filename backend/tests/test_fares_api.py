"""Tests for POST /api/v1/fares/compare."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services.fares import DEMO_ESTIMATES_NOTICE, get_demo_fare_comparison

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


def make_client() -> TestClient:
    return TestClient(create_app())


def make_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {"pickup": PICKUP, "destination": DESTINATION}

    return {**payload, **overrides}


def post(payload: dict[str, Any]) -> Any:
    return make_client().post(ENDPOINT, json=payload)


def test_compare_returns_demo_estimates() -> None:
    response = post(make_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "demo"
    assert body["notice"] == DEMO_ESTIMATES_NOTICE
    assert body["pickup"] == {**PICKUP, "coordinates": None}
    assert body["destination"] == {**DESTINATION, "coordinates": None}
    assert len(body["estimates"]) == 9


def test_compare_covers_all_three_providers() -> None:
    estimates = post(make_payload()).json()["estimates"]

    assert {estimate["provider"] for estimate in estimates} == {
        "rapido",
        "uber",
        "ola",
    }


def test_compare_covers_all_ride_categories() -> None:
    estimates = post(make_payload()).json()["estimates"]

    assert {estimate["category"] for estimate in estimates} == {
        "bike",
        "auto",
        "cab",
    }


def test_compare_keeps_unavailable_options() -> None:
    estimates = post(make_payload()).json()["estimates"]
    by_id = {estimate["id"]: estimate for estimate in estimates}

    assert by_id["rapido-cab"]["available"] is False
    assert by_id["uber-cab"]["available"] is True
    assert sum(1 for estimate in estimates if not estimate["available"]) == 1


def test_estimate_shape_matches_app_camel_case_fields() -> None:
    estimate = post(make_payload()).json()["estimates"][0]

    assert set(estimate) == {
        "id",
        "provider",
        "category",
        "tierLabel",
        "fare",
        "currency",
        "etaMinutes",
        "available",
    }
    assert estimate["currency"] == "INR"
    assert isinstance(estimate["fare"], int)
    assert isinstance(estimate["etaMinutes"], int)


def test_compare_matches_local_service() -> None:
    expected = [
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
    ]

    assert post(make_payload()).json()["estimates"] == expected


def test_compare_is_deterministic() -> None:
    first = post(make_payload()).json()
    second = post(make_payload()).json()

    assert first == second


def test_different_route_ids_change_estimates() -> None:
    other = make_payload(destination={**DESTINATION, "id": "secunderabad"})

    assert post(make_payload()).json()["estimates"] != post(other).json()["estimates"]


def test_coordinates_are_echoed_when_supplied() -> None:
    payload = make_payload(
        pickup={
            **PICKUP,
            "coordinates": {"latitude": 17.4435, "longitude": 78.3772},
        }
    )

    body = post(payload).json()

    assert body["pickup"]["coordinates"] == {
        "latitude": 17.4435,
        "longitude": 78.3772,
        "address": None,
    }
    assert body["destination"]["coordinates"] is None


def test_coordinates_do_not_change_estimates() -> None:
    """Fares are demo data; coordinates must not be turned into a fake quote."""

    with_coords = make_payload(
        pickup={
            **PICKUP,
            "coordinates": {"latitude": 17.4435, "longitude": 78.3772},
        }
    )

    assert (
        post(with_coords).json()["estimates"]
        == post(make_payload()).json()["estimates"]
    )


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({"pickup": PICKUP}, id="missing-destination"),
        pytest.param({"destination": DESTINATION}, id="missing-pickup"),
        pytest.param({}, id="empty-body"),
        pytest.param(
            make_payload(pickup={**PICKUP, "id": ""}), id="blank-place-id"
        ),
        pytest.param(
            make_payload(pickup={**PICKUP, "id": "   "}), id="whitespace-place-id"
        ),
        pytest.param(
            make_payload(pickup={**PICKUP, "name": ""}), id="blank-place-name"
        ),
        pytest.param(
            make_payload(destination={**DESTINATION, "address": ""}),
            id="blank-place-address",
        ),
        pytest.param(
            make_payload(pickup={"id": "hitech-city", "name": "Hitech City"}),
            id="missing-address",
        ),
        pytest.param(
            make_payload(pickup={**PICKUP, "coordinates": {"latitude": 91.0, "longitude": 78.0}}),
            id="latitude-out-of-range",
        ),
        pytest.param(
            make_payload(pickup={**PICKUP, "coordinates": {"latitude": 17.4, "longitude": 180.5}}),
            id="longitude-out-of-range",
        ),
        pytest.param(
            make_payload(pickup={**PICKUP, "coordinates": {"latitude": 17.4}}),
            id="half-coordinate-pair",
        ),
        pytest.param(
            make_payload(pickup={**PICKUP, "coordinates": "17.4,78.3"}),
            id="coordinates-not-an-object",
        ),
        pytest.param(
            make_payload(pickup={**PICKUP, "id": 12345}), id="id-wrong-type"
        ),
        pytest.param(
            make_payload(pickup=[PICKUP]),  # type: ignore[list-item]
            id="pickup-not-an-object",
        ),
    ],
)
def test_invalid_payloads_are_rejected(payload: dict[str, Any]) -> None:
    response = post(payload)

    assert response.status_code == 422
    assert "estimates" not in response.json()


def test_place_fields_are_trimmed() -> None:
    body = post(make_payload(pickup={**PICKUP, "name": "  Hitech City  "})).json()

    assert body["pickup"]["name"] == "Hitech City"
    assert body["pickup"]["id"] == "hitech-city"


def test_client_cannot_forge_fare_values() -> None:
    """Estimate fields sent by a client are ignored, not echoed."""

    response = post(
        make_payload(
            estimates=[
                {
                    "id": "rapido-bike",
                    "provider": "rapido",
                    "category": "bike",
                    "tierLabel": "Bike",
                    "fare": 1,
                    "currency": "USD",
                    "etaMinutes": 0,
                    "available": True,
                }
            ]
        )
    )

    assert response.status_code == 200
    estimates = response.json()["estimates"]
    assert len(estimates) == 9
    assert {estimate["currency"] for estimate in estimates} == {"INR"}
    assert all(estimate["fare"] > 1 for estimate in estimates)


def test_get_is_not_allowed() -> None:
    assert make_client().get(ENDPOINT).status_code == 405


def test_endpoint_is_documented_in_openapi() -> None:
    schema = make_client().get("/openapi.json").json()

    assert ENDPOINT in schema["paths"]
    assert "post" in schema["paths"][ENDPOINT]


def test_cors_preflight_allows_configured_origin() -> None:
    from app.core.config import get_settings

    origin = get_settings().cors_origin_list[0]

    response = make_client().options(
        ENDPOINT,
        headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
