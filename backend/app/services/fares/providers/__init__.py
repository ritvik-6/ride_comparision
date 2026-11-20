"""Provider adapters.

``base`` holds the contract; ``demo`` serves sample data; ``rapido``, ``uber``
and ``ola`` are skeletons that refuse to quote until an authorised integration
is implemented. The registry decides which of them are constructed.
"""

from app.services.fares.providers.base import (
    FareProviderAdapter,
    ProviderNotConfiguredError,
)
from app.services.fares.providers.demo import DemoAdapter
from app.services.fares.providers.ola import OlaAdapter
from app.services.fares.providers.rapido import RapidoAdapter
from app.services.fares.providers.uber import UberAdapter

__all__ = [
    "DemoAdapter",
    "FareProviderAdapter",
    "OlaAdapter",
    "ProviderNotConfiguredError",
    "RapidoAdapter",
    "UberAdapter",
]
