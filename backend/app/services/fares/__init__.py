"""Fare services.

``demo_fares`` is the deterministic sample generator; ``models`` holds the
provider-agnostic domain types; ``aggregator`` runs the adapters in ``providers``
and assembles their quotes into one comparison; ``registry`` chooses those
adapters from configuration.
"""

from app.services.fares.aggregator import (
    FareAggregator,
    MixedQuoteSourcesError,
    order_provider_states,
    order_quotes,
)
from app.services.fares.demo_fares import (
    CURRENCY,
    DEMO_ESTIMATES_NOTICE,
    DEMO_OFFERS,
    DEMO_SOURCE,
    DemoFareEstimate,
    DemoOffer,
    get_demo_fare_comparison,
    stable_hash,
)
from app.services.fares.models import (
    CATEGORY_ORDER,
    PROVIDER_ORDER,
    FareComparison,
    GeoPoint,
    PlaceRef,
    ProviderCapabilities,
    ProviderErrorCode,
    ProviderId,
    ProviderQuote,
    ProviderState,
    ProviderStatus,
    QuoteRequest,
    QuoteSource,
    QuoteStatus,
    RideCategory,
)
from app.services.fares.notices import LIVE_ESTIMATES_NOTICE, LIVE_NO_QUOTES_NOTICE
from app.services.fares.providers import (
    DemoAdapter,
    FareProviderAdapter,
    OlaAdapter,
    ProviderNotConfiguredError,
    RapidoAdapter,
    UberAdapter,
)
from app.services.fares.registry import (
    PROVIDER_SPECS,
    ProviderRegistryConfigurationError,
    ProviderSpec,
    build_adapters,
    configured_providers,
)

__all__ = [
    "CATEGORY_ORDER",
    "CURRENCY",
    "DEMO_ESTIMATES_NOTICE",
    "DEMO_OFFERS",
    "DEMO_SOURCE",
    "PROVIDER_ORDER",
    "DemoAdapter",
    "DemoFareEstimate",
    "DemoOffer",
    "FareAggregator",
    "FareComparison",
    "FareProviderAdapter",
    "GeoPoint",
    "MixedQuoteSourcesError",
    "OlaAdapter",
    "LIVE_ESTIMATES_NOTICE",
    "LIVE_NO_QUOTES_NOTICE",
    "PROVIDER_SPECS",
    "PlaceRef",
    "ProviderCapabilities",
    "ProviderErrorCode",
    "ProviderId",
    "ProviderNotConfiguredError",
    "ProviderQuote",
    "ProviderRegistryConfigurationError",
    "ProviderSpec",
    "ProviderState",
    "ProviderStatus",
    "QuoteRequest",
    "QuoteSource",
    "QuoteStatus",
    "RapidoAdapter",
    "RideCategory",
    "UberAdapter",
    "build_adapters",
    "configured_providers",
    "get_demo_fare_comparison",
    "order_provider_states",
    "order_quotes",
    "stable_hash",
]
