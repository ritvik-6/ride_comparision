"""Wire-level tests for providerStates and live-mode provenance."""

from __future__ import annotations

from typing import Any, Sequence

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_fare_aggregator
from app.core.config import Settings
from app.main import create_app
from app.services.fares import (
    LIVE_ESTIMATES_NOTICE,
    LIVE_NO_QUOTES_NOTICE,
    FareAggregator,
    ProviderCapabilities,
    ProviderId,
    ProviderQuote,
    QuoteRequest,
    QuoteSource,
    QuoteStatus,
    RideCategory,
)

PLACES = {
    "pickup": {"id": "hitech-city", "name": "Hitech City", "address": "Madhapur"},
    "destination": {"id": "airport", "name": "Airport", "address": "Shamshabad"},
}

SECRET = "sk-live-should-never-be-returned"

STATE_KEYS = {"provider", "status", "latencyMs", "errorCode"}

CATEGORIES = {
    ProviderId.RAPIDO: RideCategory.BIKE,
    ProviderId.UBER: RideCategory.AUTO,
    ProviderId.OLA: RideCategory.CAB,
}


def make_quote(provider: ProviderId) -> ProviderQuote:
    return ProviderQuote(
        provider=provider,
        category=CATEGORIES[provider],
        tier_label="Prime",
        fare=150,
        currency="INR",
        eta_minutes=4,
        available=True,
        status=QuoteStatus.QUOTED,
    )


class FakeAdapter:
    source = QuoteSource.PROVIDER_API

    def __init__(
        self,
        provider: ProviderId,
        *,
        quotes: Sequence[ProviderQuote] = (),
        error: BaseException | None = None,
    ) -> None:
        self.name = provider.value
        self.providers = (provider,)
        self.capabilities = ProviderCapabilities(
            providers=(provider,),
            categories=None,
            coordinates_required=None,
            credentials_required=None,
            expiry_supported=None,
        )
        self.quotes = tuple(quotes)
        self.error = error

    async def compare(self, request: QuoteRequest) -> Sequence[ProviderQuote]:
        if self.error is not None:
            raise self.error

        return self.quotes


def make_client(aggregator: FareAggregator | None = None) -> TestClient:
    app = create_app(Settings(_env_file=None))

    if aggregator is not None:
        app.dependency_overrides[get_fare_aggregator] = lambda: aggregator

    return TestClient(app)


def post(client: TestClient) -> dict[str, Any]:
    response = client.post("/api/v1/fares/compare", json=PLACES)

    assert response.status_code == 200

    return response.json()


def states(body: dict[str, Any]) -> list[dict[str, Any]]:
    value = body.get("providerStates")
    assert isinstance(value, list)

    return value


def state_providers(body: dict[str, Any]) -> list[str]:
    return [state["provider"] for state in states(body)]


def estimate_providers(body: dict[str, Any]) -> list[str]:
    return [estimate["provider"] for estimate in body["estimates"]]


def test_live_response_reports_states_and_keeps_successful_quotes() -> None:
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(ProviderId.RAPIDO, quotes=[make_quote(ProviderId.RAPIDO)]),
            FakeAdapter(ProviderId.UBER, error=RuntimeError("down")),
            FakeAdapter(ProviderId.OLA, quotes=[make_quote(ProviderId.OLA)]),
        )
    )

    body = post(make_client(aggregator))

    assert body["source"] == "provider-api"
    assert body["notice"] == LIVE_ESTIMATES_NOTICE
    assert estimate_providers(body) == ["rapido", "ola"]

    by_provider = {state["provider"]: state for state in states(body)}
    assert list(by_provider) == ["rapido", "uber", "ola"]
    assert by_provider["uber"]["status"] == "failed"
    assert by_provider["uber"]["errorCode"] == "provider_error"
    assert by_provider["rapido"]["status"] == "success"
    assert by_provider["rapido"]["errorCode"] is None

    for state in by_provider.values():
        assert set(state) == STATE_KEYS
        assert isinstance(state["latencyMs"], int)
        assert state["latencyMs"] >= 0


def test_all_providers_failing_is_honest_about_having_no_quotes() -> None:
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(ProviderId.RAPIDO, error=RuntimeError("down")),
            FakeAdapter(ProviderId.UBER, error=RuntimeError("down")),
            FakeAdapter(ProviderId.OLA, error=RuntimeError("down")),
        )
    )

    body = post(make_client(aggregator))

    assert body["source"] == "provider-api"
    assert body["estimates"] == []
    assert body["notice"] == LIVE_NO_QUOTES_NOTICE
    assert {state["status"] for state in states(body)} == {"failed"}
    assert state_providers(body) == ["rapido", "uber", "ola"]


def test_provider_states_are_ordered_regardless_of_adapter_order() -> None:
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(ProviderId.OLA, quotes=[make_quote(ProviderId.OLA)]),
            FakeAdapter(ProviderId.RAPIDO, quotes=[make_quote(ProviderId.RAPIDO)]),
            FakeAdapter(ProviderId.UBER, quotes=[make_quote(ProviderId.UBER)]),
        )
    )

    body = post(make_client(aggregator))

    assert state_providers(body) == ["rapido", "uber", "ola"]
    assert estimate_providers(body) == ["rapido", "uber", "ola"]


def test_demo_response_has_no_provider_states_key() -> None:
    body = post(make_client())

    assert body["source"] == "demo"
    assert "providerStates" not in body


def test_provider_errors_never_leak_their_message() -> None:
    aggregator = FareAggregator(
        adapters=(
            FakeAdapter(
                ProviderId.UBER,
                error=RuntimeError(f"token rejected: {SECRET}"),
            ),
        )
    )
    client = make_client(aggregator)

    response = client.post("/api/v1/fares/compare", json=PLACES)
    body = response.json()

    assert response.status_code == 200
    assert SECRET not in response.text
    assert body["providerStates"][0]["errorCode"] == "provider_error"
    assert body["providerStates"][0]["status"] == "failed"
    # No `message`, `detail` or exception text anywhere in the state.
    assert set(body["providerStates"][0]) == STATE_KEYS


@pytest.mark.parametrize("path", ["/openapi.json"])
def test_provider_states_are_documented(path: str) -> None:
    schema = make_client().get(path).json()
    components = schema["components"]["schemas"]
    properties = components["FareComparisonResponse"]["properties"]

    assert "providerStates" in properties
    assert "status" in components["ProviderStateModel"]["properties"]
