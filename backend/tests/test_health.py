"""Tests for the health endpoint and its CORS configuration."""

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


def make_client() -> TestClient:
    return TestClient(create_app())


def test_health_returns_ok_payload() -> None:
    response = make_client().get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["app"]
    assert body["version"]
    assert body["environment"]


def test_health_reports_configured_application_name() -> None:
    settings = get_settings()

    body = make_client().get("/health").json()

    assert body["app"] == settings.app_name
    assert body["version"] == settings.app_version
    assert body["environment"] == settings.environment


def test_health_rejects_non_get_methods() -> None:
    response = make_client().post("/health")

    assert response.status_code == 405


def test_cors_preflight_allows_configured_origin() -> None:
    origin = get_settings().cors_origin_list[0]

    response = make_client().options(
        "/health",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_cors_preflight_rejects_unlisted_origin() -> None:
    response = make_client().options(
        "/health",
        headers={
            "Origin": "https://not-configured.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
