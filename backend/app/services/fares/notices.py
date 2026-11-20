"""Client-facing disclosure copy for each quote source.

Kept apart from the generators so wording can change without touching fare logic,
and so no response can claim a provenance it does not have: demo numbers are
never described as live, and an all-failed live comparison says so.
"""

LIVE_ESTIMATES_NOTICE = (
    "Fares and ETAs come from authorised provider quotes where available. "
    "Providers that could not be reached are listed with their status, and no "
    "price is shown for them."
)

LIVE_NO_QUOTES_NOTICE = (
    "No provider returned a quote for this route. The status for each provider "
    "explains why, and no fare has been estimated in their place."
)
