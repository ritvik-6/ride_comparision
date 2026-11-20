"""Tests for provider selection.

The registry is the only gate between configuration and a running integration,
so these tests care most about the things it must refuse.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import build_fare_aggregator
from app.core.config import Settings
from app.main import create_app
from app.services.fares import (
    PROVIDER_ORDER,
    PROVIDER_SPECS,
    DemoAdapter,
    OlaAdapter,
    ProviderId,
    ProviderRegistryConfigurationError,
    QuoteSource,
    RapidoAdapter,
    UberAdapter,
    build_adapters,
    configured_providers,
)

CREDENTIALS = {
    "client_id": "test-client-id",
    "client_secret": "test-client-secret",  # noqa: S105 - test fixture
}

PLACES = {
    "pickup": {"id": "hitech-city", "name": "Hitech City", "address": "Madhapur"},
    "destination": {"id": "airport", "name": "Airport", "address": "Shamshabad"},
}


def make_settings(**overrides: object) -> Settings:
    return Settings(_env_file=None, **overrides)  # type: ignore[arg-type]


def adapters(settings: Settings) -> tuple[object, ...]:
    return build_adapters(settings)


# --- demo mode -------------------------------------------------------------


def test_demo_is_the_default_and_the_only_adapter() -> None:
    settings = make_settings()

    assert settings.provider_mode == "demo"
    assert [type(adapter) for adapter in adapters(settings)] == [DemoAdapter]


def test_demo_mode_ignores_enabled_flags_and_credentials() -> None:
    """A leftover credential must never make a demo deployment call a provider."""

    settings = make_settings(
        uber_enabled=True,
        uber_client_id=CREDENTIALS["client_id"],
        uber_client_secret=CREDENTIALS["client_secret"],
    )

    aggregator = build_fare_aggregator(settings)

    assert [adapter.name for adapter in aggregator.adapters] == ["demo"]
    assert aggregator.source is QuoteSource.DEMO


def test_demo_mode_serves_the_unchanged_endpoint() -> None:
    app = create_app(
        Settings(
            _env_file=None,
            uber_enabled=True,
            uber_client_id=CREDENTIALS["client_id"],
            uber_client_secret=CREDENTIALS["client_secret"],
        )
    )

    response = TestClient(app).post("/api/v1/fares/compare", json=PLACES)

    assert response.status_code == 200
    assert response.json()["source"] == "demo"
    assert len(response.json()["estimates"]) == 9


def test_configured_providers_in_demo_mode_covers_every_provider() -> None:
    assert configured_providers(make_settings()) == PROVIDER_ORDER


# --- live mode refusals ----------------------------------------------------


def test_live_mode_requires_at_least_one_enabled_provider() -> None:
    with pytest.raises(ProviderRegistryConfigurationError) as raised:
        build_adapters(make_settings(provider_mode="live"))

    message = str(raised.value)
    assert "PROVIDER_MODE=live" in message
    assert "Rapido" in message and "Uber" in message and "Ola" in message


def test_live_mode_rejects_an_enabled_provider_without_credentials() -> None:
    with pytest.raises(ProviderRegistryConfigurationError) as raised:
        build_adapters(make_settings(provider_mode="live", uber_enabled=True))

    message = str(raised.value)
    assert "Uber" in message
    assert "UBER_CLIENT_ID" in message
    assert "UBER_CLIENT_SECRET" in message


def test_live_mode_rejects_a_partially_configured_provider() -> None:
    with pytest.raises(ProviderRegistryConfigurationError) as raised:
        build_adapters(
            make_settings(
                provider_mode="live",
                ola_enabled=True,
                ola_client_id=CREDENTIALS["client_id"],
            )
        )

    message = str(raised.value)
    assert "OLA_CLIENT_SECRET" in message
    assert "OLA_CLIENT_ID," not in message
    assert "OLA_CLIENT_ID " not in message


def test_blank_credentials_count_as_missing() -> None:
    with pytest.raises(ProviderRegistryConfigurationError):
        build_adapters(
            make_settings(
                provider_mode="live",
                rapido_enabled=True,
                rapido_client_id="   ",
                rapido_client_secret="",
            )
        )


def test_a_valid_provider_does_not_excuse_a_broken_one() -> None:
    """Half-live would be indistinguishable from fully-live to a rider."""

    with pytest.raises(ProviderRegistryConfigurationError) as raised:
        build_adapters(
            make_settings(
                provider_mode="live",
                rapido_enabled=True,
                rapido_client_id=CREDENTIALS["client_id"],
                rapido_client_secret=CREDENTIALS["client_secret"],
                uber_enabled=True,
            )
        )

    assert "Uber" in str(raised.value)


def test_live_mode_fails_at_startup_not_per_request() -> None:
    with pytest.raises(ProviderRegistryConfigurationError):
        create_app(Settings(_env_file=None, provider_mode="live"))


# --- live mode selection ---------------------------------------------------


def test_single_configured_provider_is_selected() -> None:
    settings = make_settings(
        provider_mode="live",
        rapido_enabled=True,
        rapido_client_id=CREDENTIALS["client_id"],
        rapido_client_secret=CREDENTIALS["client_secret"],
    )

    aggregator = build_fare_aggregator(settings)

    assert [type(adapter) for adapter in aggregator.adapters] == [RapidoAdapter]
    assert aggregator.source is QuoteSource.PROVIDER_API
    assert configured_providers(settings) == (ProviderId.RAPIDO,)


def test_all_configured_providers_are_selected_in_response_order() -> None:
    settings = make_settings(
        provider_mode="live",
        rapido_enabled=True,
        rapido_client_id=CREDENTIALS["client_id"],
        rapido_client_secret=CREDENTIALS["client_secret"],
        uber_enabled=True,
        uber_client_id=CREDENTIALS["client_id"],
        uber_client_secret=CREDENTIALS["client_secret"],
        ola_enabled=True,
        ola_client_id=CREDENTIALS["client_id"],
        ola_client_secret=CREDENTIALS["client_secret"],
    )

    aggregator = build_fare_aggregator(settings)

    assert [type(adapter) for adapter in aggregator.adapters] == [
        RapidoAdapter,
        UberAdapter,
        OlaAdapter,
    ]
    assert configured_providers(settings) == PROVIDER_ORDER


def test_specs_follow_the_response_order() -> None:
    assert tuple(spec.provider for spec in PROVIDER_SPECS) == PROVIDER_ORDER


def test_configured_providers_excludes_unconfigured_ones() -> None:
    settings = make_settings(
        provider_mode="live",
        rapido_enabled=True,
        rapido_client_id=CREDENTIALS["client_id"],
        rapido_client_secret=CREDENTIALS["client_secret"],
        uber_enabled=True,
    )

    assert configured_providers(settings) == (ProviderId.RAPIDO,)
