"""Turns configuration into a concrete set of adapters.

This is the only place that reads ``PROVIDER_MODE`` and decides what actually
runs. Two rules matter more than the plumbing:

* Demo is the default, and demo mode ignores provider flags and credentials
  entirely, so a leftover credential in a developer's ``.env`` can never make a
  demo deployment call a provider.
* Live mode is opt-in and strict. If a provider is enabled but not fully
  configured the app refuses to start, rather than quietly serving two live
  providers and one demo one — which would be indistinguishable to a rider.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Final

from pydantic import SecretStr

from app.core.config import Settings
from app.services.fares.models import PROVIDER_ORDER, ProviderId
from app.services.fares.providers import (
    DemoAdapter,
    FareProviderAdapter,
    OlaAdapter,
    RapidoAdapter,
    UberAdapter,
)


class ProviderRegistryConfigurationError(ValueError):
    """``PROVIDER_MODE=live`` cannot be served with the current configuration."""


@dataclass(frozen=True, slots=True)
class ProviderSpec:
    """How one provider is switched on and constructed."""

    provider: ProviderId
    label: str
    build: Callable[[], FareProviderAdapter]
    is_enabled: Callable[[Settings], bool]
    missing_credentials: Callable[[Settings], tuple[str, ...]]


def _missing(*credentials: tuple[str, SecretStr | None]) -> tuple[str, ...]:
    """Names of credential settings that are unset or blank.

    A blank value is treated exactly like an absent one: a placeholder in a
    ``.env`` file is not a credential.
    """

    return tuple(
        name
        for name, value in credentials
        if value is None or not value.get_secret_value().strip()
    )


#: Registered providers, in response order. Adding an integration means adding
#: a spec here and a real adapter, not touching the route.
PROVIDER_SPECS: Final[tuple[ProviderSpec, ...]] = (
    ProviderSpec(
        provider=ProviderId.RAPIDO,
        label="Rapido",
        build=RapidoAdapter,
        is_enabled=lambda settings: settings.rapido_enabled,
        missing_credentials=lambda settings: _missing(
            ("RAPIDO_CLIENT_ID", settings.rapido_client_id),
            ("RAPIDO_CLIENT_SECRET", settings.rapido_client_secret),
        ),
    ),
    ProviderSpec(
        provider=ProviderId.UBER,
        label="Uber",
        build=UberAdapter,
        is_enabled=lambda settings: settings.uber_enabled,
        missing_credentials=lambda settings: _missing(
            ("UBER_CLIENT_ID", settings.uber_client_id),
            ("UBER_CLIENT_SECRET", settings.uber_client_secret),
        ),
    ),
    ProviderSpec(
        provider=ProviderId.OLA,
        label="Ola",
        build=OlaAdapter,
        is_enabled=lambda settings: settings.ola_enabled,
        missing_credentials=lambda settings: _missing(
            ("OLA_CLIENT_ID", settings.ola_client_id),
            ("OLA_CLIENT_SECRET", settings.ola_client_secret),
        ),
    ),
)


def build_adapters(settings: Settings) -> tuple[FareProviderAdapter, ...]:
    """Return the adapters for ``settings.provider_mode``.

    Raises:
        ProviderRegistryConfigurationError: in live mode, when no provider is
            enabled, or when an enabled provider is missing credentials.
    """

    if settings.provider_mode == "demo":
        return (DemoAdapter(),)

    enabled = tuple(spec for spec in PROVIDER_SPECS if spec.is_enabled(settings))

    if not enabled:
        raise ProviderRegistryConfigurationError(
            "PROVIDER_MODE=live requires at least one provider to be enabled, "
            f"but none of {_labels()} is. Enable a provider with credentials, "
            "or set PROVIDER_MODE=demo to serve sample estimates."
        )

    incomplete = tuple(
        (spec, spec.missing_credentials(settings))
        for spec in enabled
        if spec.missing_credentials(settings)
    )

    if incomplete:
        details = "; ".join(
            f"{spec.label} ({', '.join(names)})" for spec, names in incomplete
        )
        raise ProviderRegistryConfigurationError(
            "PROVIDER_MODE=live cannot start: enabled providers are missing "
            f"credentials: {details}. Set them in backend/.env, or disable "
            "those providers."
        )

    return tuple(spec.build() for spec in enabled)


def configured_providers(settings: Settings) -> tuple[ProviderId, ...]:
    """The providers this configuration would actually quote from.

    Demo mode reports every provider, because the demo adapter covers all
    three; live mode reports only the enabled and fully configured ones.
    """

    if settings.provider_mode == "demo":
        return PROVIDER_ORDER

    return tuple(
        spec.provider
        for spec in PROVIDER_SPECS
        if spec.is_enabled(settings) and not spec.missing_credentials(settings)
    )


def _labels() -> str:
    return ", ".join(spec.label for spec in PROVIDER_SPECS)
