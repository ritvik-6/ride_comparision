"""Tests for provider configuration.

Settings are constructed with explicit keyword arguments and ``_env_file=None``
so these tests describe the schema, not whatever a developer has in
``backend/.env``. No credentials are needed anywhere.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import Settings

SECRET = "sentinel-secret-value-9f3c"  # noqa: S105 - test fixture, not a credential


def make_settings(**overrides: object) -> Settings:
    return Settings(_env_file=None, **overrides)  # type: ignore[arg-type]


def test_provider_mode_defaults_to_demo() -> None:
    settings = make_settings()

    assert settings.provider_mode == "demo"


def test_provider_mode_must_be_demo_or_live() -> None:
    with pytest.raises(ValidationError):
        make_settings(provider_mode="production")

    assert make_settings(provider_mode="live").provider_mode == "live"


def test_timeouts_have_safe_defaults() -> None:
    settings = make_settings()

    assert settings.provider_request_timeout_seconds == 4.0
    assert settings.provider_total_budget_seconds == 6.0
    assert (
        settings.provider_total_budget_seconds
        >= settings.provider_request_timeout_seconds
    )


@pytest.mark.parametrize("value", [0, -1, -0.5, 61])
def test_request_timeout_must_be_positive_and_bounded(value: float) -> None:
    with pytest.raises(ValidationError):
        make_settings(provider_request_timeout_seconds=value)


@pytest.mark.parametrize("value", [0, -1, 121])
def test_total_budget_must_be_positive_and_bounded(value: float) -> None:
    with pytest.raises(ValidationError):
        make_settings(provider_total_budget_seconds=value)


def test_total_budget_must_not_be_shorter_than_one_request() -> None:
    with pytest.raises(ValidationError, match="PROVIDER_TOTAL_BUDGET_SECONDS"):
        make_settings(
            provider_request_timeout_seconds=5,
            provider_total_budget_seconds=2,
        )

    # Equal is allowed: one provider may use the whole budget.
    assert make_settings(
        provider_request_timeout_seconds=5,
        provider_total_budget_seconds=5,
    ).provider_total_budget_seconds == 5


def test_every_provider_is_disabled_by_default() -> None:
    settings = make_settings()

    assert settings.rapido_enabled is False
    assert settings.uber_enabled is False
    assert settings.ola_enabled is False


def test_credentials_are_optional() -> None:
    settings = make_settings()

    assert settings.rapido_client_id is None
    assert settings.rapido_client_secret is None
    assert settings.uber_client_id is None
    assert settings.uber_client_secret is None
    assert settings.ola_client_id is None
    assert settings.ola_client_secret is None


def test_credentials_are_secret_values() -> None:
    settings = make_settings(
        uber_enabled=True,
        uber_client_id=SECRET,
        uber_client_secret=SECRET,
    )

    assert settings.uber_client_id is not None
    assert settings.uber_client_id.get_secret_value() == SECRET


def test_secrets_never_appear_in_repr_or_dumps() -> None:
    settings = make_settings(
        uber_client_id=SECRET,
        uber_client_secret=SECRET,
        ola_client_id=SECRET,
        ola_client_secret=SECRET,
        rapido_client_id=SECRET,
        rapido_client_secret=SECRET,
    )

    surfaces = [
        repr(settings),
        str(settings),
        settings.model_dump_json(),
        str(settings.model_dump()),
        str(settings.model_dump(mode="json")),
    ]

    for surface in surfaces:
        assert SECRET not in surface
        assert "**********" in surface


def test_secret_wrappers_redact_their_own_repr() -> None:
    settings = make_settings(rapido_client_secret=SECRET)

    assert settings.rapido_client_secret is not None
    assert SECRET not in repr(settings.rapido_client_secret)
    assert SECRET not in str(settings.rapido_client_secret)
