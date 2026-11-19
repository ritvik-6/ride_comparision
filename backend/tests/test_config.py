"""Tests for environment configuration parsing and validation."""

import pytest
from pydantic import ValidationError

from app.core.config import DEFAULT_CORS_ORIGINS, Settings


def test_cors_origins_are_split_and_normalised() -> None:
    settings = Settings(
        cors_origins="http://localhost:8081, https://ridecompare.example.com/ "
    )

    assert settings.cors_origin_list == [
        "http://localhost:8081",
        "https://ridecompare.example.com",
    ]


def test_default_origins_are_not_a_wildcard() -> None:
    assert "*" not in Settings(cors_origins=DEFAULT_CORS_ORIGINS).cors_origin_list


@pytest.mark.parametrize(
    "value",
    [
        "*",
        "http://localhost:8081,*",
        "",
        "localhost:8081",
        "http://localhost:8081/app",
    ],
)
def test_invalid_cors_origins_are_rejected(value: str) -> None:
    with pytest.raises(ValidationError):
        Settings(cors_origins=value)


def test_environment_must_be_known() -> None:
    with pytest.raises(ValidationError):
        Settings(environment="not-an-environment")
