"""Request and response models for the fare comparison endpoint.

Field names use the same camelCase convention as the app's TypeScript fare
types (``tierLabel``, ``etaMinutes``), so the payload can be used on the client
without a translation layer.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from pydantic.alias_generators import to_camel

RideProvider = Literal["rapido", "uber", "ola"]
RideCategory = Literal["bike", "auto", "cab"]

#: Demo estimates and authorised provider quotes are served separately; a
#: response is never a blend of the two.
FareQuoteSource = Literal["demo", "provider-api"]

#: How one provider's call went, or why it was not made. Mirrors
#: ``ProviderStatus`` in the domain.
ProviderStatusValue = Literal[
    "success", "not_configured", "timed_out", "failed", "unsupported"
]

#: The only error detail a client may see. Mirrors ``ProviderErrorCode``; a
#: raw exception message, provider body or credential is never serialised.
ProviderErrorCodeValue = Literal[
    "timeout", "total_budget_exceeded", "provider_error", "missing_coordinates"
]

PlaceId = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=128)
]
PlaceName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
PlaceAddress = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]


class CamelModel(BaseModel):
    """Base model that speaks camelCase over the wire."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",
    )


class Coordinates(CamelModel):
    """A WGS-84 position.

    Both components are required: a half pair is almost always a client bug, so
    it is rejected rather than silently dropped.
    """

    latitude: float = Field(ge=-90, le=90, description="Latitude in decimal degrees.")
    longitude: float = Field(
        ge=-180, le=180, description="Longitude in decimal degrees."
    )
    address: str | None = Field(
        default=None,
        max_length=500,
        description="Optional formatted address for the coordinate pair.",
    )


class PlaceInput(CamelModel):
    """One endpoint of the trip, as selected in the app."""

    id: PlaceId = Field(
        description="Stable place id, e.g. 'hitech-city'. Drives the demo variation."
    )
    name: PlaceName = Field(description="Short display name, e.g. 'Hitech City'.")
    address: PlaceAddress = Field(description="Full readable address.")
    coordinates: Coordinates | None = Field(
        default=None,
        description="Present for device-derived places; mock places omit it.",
    )


class FareCompareRequest(CamelModel):
    """Body of ``POST /api/v1/fares/compare``."""

    pickup: PlaceInput = Field(description="Where the ride starts.")
    destination: PlaceInput = Field(description="Where the ride ends.")


class PlaceSummary(CamelModel):
    """The request place, echoed back so the response is self-contained."""

    id: str
    name: str
    address: str
    coordinates: Coordinates | None = None


class FareEstimateModel(CamelModel):
    """One provider/tier estimate.

    Mirrors the app's ``FareEstimate`` interface field for field.
    """

    id: str = Field(description="Estimate id, '<provider>-<category>'.")
    provider: RideProvider
    category: RideCategory
    tier_label: str = Field(description="The provider's own tier name, e.g. 'Moto'.")
    fare: int = Field(ge=0, description="Sample fare in whole rupees.")
    currency: str = Field(description="ISO 4217 code, always 'INR' today.")
    eta_minutes: int = Field(ge=0, description="Sample pickup wait in minutes.")
    available: bool = Field(
        description="False when the provider does not serve this tier on this route."
    )


class ProviderStateModel(CamelModel):
    """The outcome of asking one provider for quotes."""

    provider: RideProvider
    status: ProviderStatusValue = Field(
        description="'success', or why this provider contributed no quote."
    )
    latency_ms: int = Field(
        ge=0, description="Locally measured call duration in milliseconds."
    )
    error_code: ProviderErrorCodeValue | None = Field(
        default=None,
        description="Enumerated, non-sensitive failure reason; never a message.",
    )


class FareComparisonResponse(CamelModel):
    """Estimates for one route, with their provenance.

    ``source`` and ``notice`` exist so no client can present these numbers as
    something they are not: demo numbers are never called live quotes.
    """

    source: FareQuoteSource = Field(
        description="'demo' for sample data, 'provider-api' for live quotes."
    )
    notice: str = Field(description="Human-readable provenance disclosure.")
    pickup: PlaceSummary
    destination: PlaceSummary
    estimates: list[FareEstimateModel] = Field(
        description="Every offer, including unavailable tiers."
    )
    provider_states: list[ProviderStateModel] | None = Field(
        default=None,
        description=(
            "Per-provider outcome. Present for live comparisons; omitted for "
            "demo, whose response is a published contract and stays unchanged."
        ),
    )
