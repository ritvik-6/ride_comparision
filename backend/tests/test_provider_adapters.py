"""Tests for the skeleton provider adapters.

They must refuse to quote, and must refuse in a way a caller can act on. No
credentials, no network, no endpoints.
"""

from __future__ import annotations

import asyncio
import inspect
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.services.fares import (
    OlaAdapter,
    PlaceRef,
    ProviderId,
    ProviderNotConfiguredError,
    QuoteRequest,
    QuoteSource,
    QuoteStatus,
    RapidoAdapter,
    UberAdapter,
)
from app.services.fares.providers import ola, rapido, uber

PICKUP = PlaceRef(id="hitech-city", name="Hitech City", address="Madhapur")
DESTINATION = PlaceRef(id="airport", name="Airport", address="Shamshabad")
REQUEST = QuoteRequest(pickup=PICKUP, destination=DESTINATION)

PLACES = {
    "pickup": {"id": "hitech-city", "name": "Hitech City", "address": "Madhapur"},
    "destination": {"id": "airport", "name": "Airport", "address": "Shamshabad"},
}

SKELETONS = [
    pytest.param(RapidoAdapter, ProviderId.RAPIDO, "rapido", id="rapido"),
    pytest.param(UberAdapter, ProviderId.UBER, "uber", id="uber"),
    pytest.param(OlaAdapter, ProviderId.OLA, "ola", id="ola"),
]


@pytest.mark.parametrize(("adapter_class", "provider", "name"), SKELETONS)
def test_skeleton_identity(
    adapter_class: type,
    provider: ProviderId,
    name: str,
) -> None:
    adapter = adapter_class()

    assert adapter.name == name
    assert adapter.providers == (provider,)
    assert adapter.source is QuoteSource.PROVIDER_API


@pytest.mark.parametrize(("adapter_class", "provider", "name"), SKELETONS)
def test_skeleton_satisfies_the_adapter_contract(
    adapter_class: type,
    provider: ProviderId,
    name: str,
) -> None:
    adapter = adapter_class()

    assert inspect.iscoroutinefunction(adapter.compare)


@pytest.mark.parametrize(("adapter_class", "provider", "name"), SKELETONS)
def test_compare_raises_a_typed_not_configured_error(
    adapter_class: type,
    provider: ProviderId,
    name: str,
) -> None:
    adapter = adapter_class()

    with pytest.raises(ProviderNotConfiguredError) as raised:
        asyncio.run(adapter.compare(REQUEST))

    error = raised.value
    assert error.provider is provider
    assert error.status is QuoteStatus.NOT_CONFIGURED
    assert "PROVIDER_MODE=demo" in str(error)
    # The message must not read like a quote, and must not claim a live call.
    assert "no " in str(error).lower()


@pytest.mark.parametrize(
    "module",
    [rapido, uber, ola],
    ids=lambda module: module.__name__.rsplit(".", maxsplit=1)[-1],
)
def test_skeletons_contain_no_endpoints_and_no_http_client(module: object) -> None:
    """Guards against a future edit wiring a real call into a skeleton."""

    path = inspect.getfile(module)  # type: ignore[arg-type]
    source = Path(path).read_text(encoding="utf-8")

    for banned in ("http://", "https://", "httpx", "requests.", "aiohttp"):
        assert banned not in source


def test_live_mode_with_a_configured_skeleton_reports_not_configured() -> None:
    """A configured skeleton still refuses rather than inventing a fare."""

    app = create_app(
        Settings(
            _env_file=None,
            provider_mode="live",
            rapido_enabled=True,
            rapido_client_id="id",
            rapido_client_secret="secret",  # noqa: S106 - test fixture
        )
    )

    response = TestClient(app).post("/api/v1/fares/compare", json=PLACES)

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "provider-api"
    assert body["estimates"] == []
    assert body["providerStates"] == [
        {
            "provider": "rapido",
            "status": "not_configured",
            "latencyMs": body["providerStates"][0]["latencyMs"],
            "errorCode": None,
        }
    ]
