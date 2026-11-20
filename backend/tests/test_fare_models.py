"""Tests for the fare domain models' invariants."""

from __future__ import annotations

import dataclasses

import pytest

from app.services.fares.models import (
    CATEGORY_ORDER,
    PROVIDER_ORDER,
    FareComparison,
    ProviderErrorCode,
    ProviderId,
    ProviderQuote,
    ProviderState,
    ProviderStatus,
    QuoteSource,
    QuoteStatus,
    RideCategory,
)


def make_quote(**overrides: object) -> ProviderQuote:
    fields: dict[str, object] = {
        "provider": ProviderId.UBER,
        "category": RideCategory.AUTO,
        "tier_label": "Auto",
        "fare": 95,
        "currency": "INR",
        "eta_minutes": 5,
        "available": True,
        "status": QuoteStatus.QUOTED,
    }

    return ProviderQuote(**{**fields, **overrides})  # type: ignore[arg-type]


def test_available_and_status_must_agree() -> None:
    with pytest.raises(ValueError, match="available"):
        make_quote(available=True, status=QuoteStatus.UNSUPPORTED)

    with pytest.raises(ValueError, match="available"):
        make_quote(available=False, status=QuoteStatus.QUOTED)


def test_unsupported_quote_is_not_available() -> None:
    quote = make_quote(available=False, status=QuoteStatus.UNSUPPORTED)

    assert quote.available is False


def test_quotes_are_immutable() -> None:
    quote = make_quote()

    with pytest.raises(dataclasses.FrozenInstanceError):
        quote.fare = 1  # type: ignore[misc]


def test_orderings_cover_every_provider_and_category_once() -> None:
    assert PROVIDER_ORDER == (ProviderId.RAPIDO, ProviderId.UBER, ProviderId.OLA)
    assert CATEGORY_ORDER == (
        RideCategory.BIKE,
        RideCategory.AUTO,
        RideCategory.CAB,
    )
    assert len(set(PROVIDER_ORDER)) == len(ProviderId)
    assert len(set(CATEGORY_ORDER)) == len(RideCategory)


def test_domain_values_match_the_wire_vocabulary() -> None:
    # The API schema accepts these exact strings; a domain rename would otherwise
    # silently turn into a 500 at response validation.
    assert [provider.value for provider in ProviderId] == ["rapido", "uber", "ola"]
    assert [category.value for category in RideCategory] == ["bike", "auto", "cab"]
    assert QuoteSource.DEMO.value == "demo"
    assert QuoteSource.PROVIDER_API.value == "provider-api"


def test_comparison_holds_a_source_and_ordered_quotes() -> None:
    comparison = FareComparison(source=QuoteSource.DEMO, quotes=(make_quote(),))

    assert comparison.source is QuoteSource.DEMO
    assert len(comparison.quotes) == 1
    assert comparison.provider_states == ()


def test_provider_state_values_match_the_wire_vocabulary() -> None:
    assert [status.value for status in ProviderStatus] == [
        "success",
        "not_configured",
        "timed_out",
        "failed",
        "unsupported",
    ]
    assert [code.value for code in ProviderErrorCode] == [
        "timeout",
        "total_budget_exceeded",
        "provider_error",
        "missing_coordinates",
    ]


def test_successful_state_cannot_carry_an_error_code() -> None:
    ProviderState(
        provider=ProviderId.UBER,
        status=ProviderStatus.SUCCESS,
        latency_ms=12,
    )

    with pytest.raises(ValueError, match="error code"):
        ProviderState(
            provider=ProviderId.UBER,
            status=ProviderStatus.SUCCESS,
            latency_ms=12,
            error_code=ProviderErrorCode.PROVIDER_ERROR,
        )


def test_failed_state_can_carry_an_error_code() -> None:
    state = ProviderState(
        provider=ProviderId.OLA,
        status=ProviderStatus.FAILED,
        latency_ms=3,
        error_code=ProviderErrorCode.PROVIDER_ERROR,
    )

    assert state.error_code is ProviderErrorCode.PROVIDER_ERROR


def test_state_latency_cannot_be_negative() -> None:
    with pytest.raises(ValueError, match="latency_ms"):
        ProviderState(
            provider=ProviderId.OLA,
            status=ProviderStatus.TIMED_OUT,
            latency_ms=-1,
        )
