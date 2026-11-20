# RideCompare Backend

FastAPI service for RideCompare. **Demo data only:** the fare endpoint returns
deterministic sample estimates ported from the mobile app. There is no database,
no authentication, and no Rapido/Uber/Ola API call anywhere in this service. The
app calls this endpoint when `EXPO_PUBLIC_API_BASE_URL` is set, and shows a retry
prompt rather than local sample fares if the backend cannot be reached.

The provider integration architecture is documented in
[`../docs/architecture/ADR-001-provider-integration.md`](../docs/architecture/ADR-001-provider-integration.md).
Read that before adding a provider.

## Stack

| Piece | Choice |
| --- | --- |
| Framework | FastAPI + Uvicorn |
| Config | `pydantic-settings`, read from environment variables / `.env` |
| Tests | pytest + FastAPI `TestClient` |
| Python | 3.11+ (developed on 3.14) |

## Layout

```
backend/
  app/
    main.py                    # create_app() factory + CORS + router wiring
    api/dependencies.py        # get_settings / get_fare_aggregator wiring
    api/routes/health.py       # GET /health
    api/routes/fares.py        # POST /api/v1/fares/compare
    core/config.py             # Settings (env vars, CORS, provider config)
    schemas/health.py          # HealthResponse model
    schemas/fares.py           # request/response models (camelCase aliases)
    services/fares/
      demo_fares.py            # deterministic sample generator (pure)
      models.py                # domain models: no FastAPI, no Pydantic
      aggregator.py            # concurrent fan-out, timeouts, ordering
      registry.py              # settings -> adapter set (demo | live)
      notices.py               # demo / live disclosure copy
      providers/
        base.py                # FareProviderAdapter protocol
        demo.py                # wraps demo_fares
        rapido.py uber.py ola.py   # skeletons: not configured, no HTTP
  tests/
    conftest.py                # pins PROVIDER_MODE so a local .env cannot alter the suite
    test_health.py             # payload, app name, method guard, CORS preflight
    test_config.py             # origin parsing and wildcard rejection
    test_demo_fares.py         # offer table, determinism, TypeScript parity
    test_fares_api.py          # endpoint, validation, CORS
    test_fare_models.py        # domain invariants and enumerations
    test_demo_adapter.py       # demo adapter mapping
    test_aggregator.py         # fan-out, ordering, failure isolation
    test_fares_route_injection.py  # route served through an injected aggregator
    test_provider_adapters.py  # skeletons refuse to quote
    test_provider_capabilities.py  # declarations, narrowing, skipping
    test_provider_config.py    # env parsing, secret handling
    test_provider_registry.py  # demo/live selection rules
    test_provider_isolation.py # concurrency, timeouts, total budget
    test_provider_states_api.py # providerStates over HTTP
    fixtures/
      demo_fares_parity.json   # expected values from the TypeScript run
      generate_demo_fares_parity.mjs
  .env.example
  pytest.ini
  requirements.txt             # runtime
  requirements-dev.txt         # runtime + tests
```

New endpoints belong in `app/api/routes/` as their own module, with request and
response models under `app/schemas/`, business logic under `app/services/`, and
registration in `app/main.py`. Services stay free of FastAPI and Pydantic types
so they can be unit-tested directly.

## Architecture

One request travels through four layers, and each layer only knows its own job:

```
POST /api/v1/fares/compare
        │  FareCompareRequest (schemas/fares.py, camelCase wire names)
        ▼
  routes/fares.py            maps wire -> domain, domain -> wire
        │  QuoteRequest (services/fares/models.py)
        ▼
  FareAggregator             runs adapters concurrently, isolates failures,
        │                    orders results, never invents a fare
        ▼
  FareProviderAdapter        demo.py today; rapido/uber/ola are skeletons
        │  ProviderQuote + ProviderState
        ▼
  FareComparison -> FareComparisonResponse
```

- **Domain models** (`services/fares/models.py`) import no FastAPI or Pydantic
  types, so adapters and the aggregator are testable without an app.
- **`FareProviderAdapter`** (`providers/base.py`) is a `typing.Protocol`:
  `name`, `source`, `providers`, `capabilities`, and an async `compare()`.
- **Capabilities** are verified facts or `None` (unverified) — never guesses. The
  aggregator narrows a request to declared tiers and skips a provider whose
  required coordinates are missing; `None` never narrows and never skips.
- **Failure isolation**: each provider gets its own timeout
  (`PROVIDER_REQUEST_TIMEOUT_SECONDS`), the whole comparison has a ceiling
  (`PROVIDER_TOTAL_BUDGET_SECONDS`), and every outcome becomes one entry in
  `providerStates`. A failing provider removes nobody else's quote and is never
  replaced with demo numbers.
- **Source separation**: `source` is `demo` or `provider-api`, and the aggregator
  refuses to mix adapters with different sources (`MixedQuoteSourcesError`).
- **Credentials** are `SecretStr`, read from the environment, and never appear in
  a response, an error message or a test fixture.

What does **not** exist yet: real HTTP calls, retries, caching, circuit breakers,
rate limiting, logging/metrics, or any database. Demo mode is the default.

## Setup (Windows PowerShell)

Run these from the repository root:

```powershell
cd backend

# 1. Create and activate the virtual environment
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1

# If PowerShell blocks the activation script, allow it for this session only:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 2. Install dependencies (dev set includes pytest)
python -m pip install --upgrade pip
pip install -r requirements-dev.txt

# 3. Create your local environment file
Copy-Item .env.example .env
```

`.env` is gitignored; `.env.example` is the committed template. Real
environment variables override values from `.env`.

## Run the server

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

- Health check: <http://127.0.0.1:8000/health> → `{"status":"ok","app":"RideCompare API",...}`
- Interactive docs: <http://127.0.0.1:8000/docs>

Without activating the venv you can call the interpreter directly:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Stop the server with `Ctrl+C`, and leave the venv with `deactivate`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness: app name, version, environment. |
| `POST` | `/api/v1/fares/compare` | Demo fare comparison for one route. |

### POST /api/v1/fares/compare

Returns sample fares and ETAs for Rapido, Uber and Ola across the Bike, Auto and
Cab tiers, including a tier a provider does not serve (`"available": false`).

- **Demo data.** The response carries `"source": "demo"` and a `notice` string.
  These numbers are not live provider quotes and must never be described as one.
- **Deterministic.** The same `pickup.id`/`destination.id` pair always returns
  the same estimates, and they match `src/services/fares/demoFares.ts` in the app
  exactly.
- **Coordinates are inert.** `coordinates` is optional, validated when present,
  and echoed back; it never changes a fare, because nothing here measures
  distance.
- **Validation.** A `422` with FastAPI's `detail` array is returned for blank or
  whitespace-only `id`/`name`/`address`, out-of-range coordinates, a
  half-supplied `latitude`/`longitude` pair, or a missing `pickup`/`destination`.

Request (the same fields the app keeps in its `Place` type):

```json
{
  "pickup": {
    "id": "hitech-city",
    "name": "Hitech City",
    "address": "HITEC City, Madhapur, Hyderabad"
  },
  "destination": {
    "id": "airport",
    "name": "Rajiv Gandhi International Airport",
    "address": "Shamshabad, Hyderabad"
  }
}
```

Response `200` (trimmed to three of the nine offers):

```json
{
  "source": "demo",
  "notice": "Fares and ETAs are sample data for this build. They are not live prices from Rapido, Uber or Ola.",
  "pickup": {
    "id": "hitech-city",
    "name": "Hitech City",
    "address": "HITEC City, Madhapur, Hyderabad",
    "coordinates": null
  },
  "destination": {
    "id": "airport",
    "name": "Rajiv Gandhi International Airport",
    "address": "Shamshabad, Hyderabad",
    "coordinates": null
  },
  "estimates": [
    {
      "id": "rapido-bike",
      "provider": "rapido",
      "category": "bike",
      "tierLabel": "Bike",
      "fare": 45,
      "currency": "INR",
      "etaMinutes": 2,
      "available": true
    },
    {
      "id": "rapido-cab",
      "provider": "rapido",
      "category": "cab",
      "tierLabel": "Cab",
      "fare": 190,
      "currency": "INR",
      "etaMinutes": 6,
      "available": false
    },
    {
      "id": "uber-cab",
      "provider": "uber",
      "category": "cab",
      "tierLabel": "Go",
      "fare": 210,
      "currency": "INR",
      "etaMinutes": 7,
      "available": true
    }
  ]
}
```

Estimate objects use camelCase (`tierLabel`, `etaMinutes`) so they line up with
the app's `FareEstimate` interface. `fare` is a whole number of rupees and
`etaMinutes` is the sample pickup wait.

### Try it in Swagger UI

1. Start the server: `uvicorn app.main:app --reload --port 8000`.
2. Open <http://127.0.0.1:8000/docs>.
3. Expand **fares → POST /api/v1/fares/compare → Try it out**.
4. Replace the placeholder body with the request above, then **Execute**.

Exception shapes and the full schema are visible under **Schemas** at the bottom
of that page; the raw document is at `/openapi.json`. From PowerShell:

```powershell
$body = '{"pickup":{"id":"hitech-city","name":"Hitech City","address":"HITEC City, Madhapur, Hyderabad"},"destination":{"id":"airport","name":"Rajiv Gandhi International Airport","address":"Shamshabad, Hyderabad"}}'
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/v1/fares/compare -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 5
```

## Demo fare parity

`app/services/fares/demo_fares.py` is a port of the app's
`src/services/fares/demoFares.ts`. Two JavaScript behaviours are reproduced
deliberately, or the two implementations would drift apart on some routes:

- **FNV-1a over UTF-16.** `charCodeAt` yields UTF-16 code units, so characters
  outside the BMP hash as surrogate pairs, and `^=` / `Math.imul` wrap to signed
  32-bit integers, with `>>> 0` returning the unsigned result.
- **`Math.round` rounding.** JavaScript rounds halves towards `+∞`; Python's
  `round()` is half-to-even. `floor(x + 0.5)` is used instead.

`tests/fixtures/demo_fares_parity.json` holds expected hashes and estimates
produced by *executing* the TypeScript module, not by transcribing it. After
changing the demo offers, regenerate it from the repository root:

```powershell
node backend/tests/fixtures/generate_demo_fares_parity.mjs
```

The generator uses the repo's installed `typescript` package to transpile the
app file, so run `npm install` first if `node_modules` is missing.

## Run the tests

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
```

`pytest.ini` sets `testpaths = tests` and puts `backend/` on `sys.path`, so the
tests import `app.*` while picking up `backend/.env` when it exists. The suite
includes the health check, the fare endpoint and its validation, and one
parametrised parity case per fixture route and hash.

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `APP_NAME` | `RideCompare API` | Shown by `/health` and in the OpenAPI title. |
| `APP_VERSION` | `0.1.0` | Shown by `/health`. |
| `ENVIRONMENT` | `development` | One of `development`, `staging`, `production`. |
| `CORS_ORIGINS` | `http://localhost:8081,http://localhost:19006` | Comma-separated exact origins. |
| `PROVIDER_MODE` | `demo` | `demo` or `live`. See below. |
| `PROVIDER_REQUEST_TIMEOUT_SECONDS` | `4.0` | Per-provider call timeout. |
| `PROVIDER_TOTAL_BUDGET_SECONDS` | `6.0` | Ceiling for one whole comparison; must be ≥ the request timeout. |
| `UBER_ENABLED` / `OLA_ENABLED` / `RAPIDO_ENABLED` | `false` | Only consulted when `PROVIDER_MODE=live`. |
| `UBER_*` / `OLA_*` / `RAPIDO_*` `_CLIENT_ID`, `_CLIENT_SECRET` | empty | Placeholders for future authorised APIs. Empty = provider off. |

CORS is allow-listed from `CORS_ORIGINS`; a `*` wildcard is rejected at startup,
as is a value without a scheme and host. Origins apply to browsers only — the
Android app is not subject to CORS. Add your Expo web or LAN origin (for example
`http://192.168.1.20:8081`) to `CORS_ORIGINS` if you develop in a browser.

Note that Android emulators reach the host machine at `10.0.2.2`, and physical
devices need your machine's LAN IP; that is configured by the app's
`EXPO_PUBLIC_API_BASE_URL` (see the repository-root `.env.example`), not by this
service.

## Provider modes

### Demo mode (default)

Nothing to configure. The registry builds a single `DemoAdapter`, ignores every
provider flag and credential, and the endpoint returns deterministic sample
estimates with `source: "demo"` and the demo notice. `providerStates` is omitted
from demo responses so the payload stays byte-for-byte identical to the original
contract.

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
# then, with the app: EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```

### Live mode

Opt-in only, and strict by design:

```dotenv
PROVIDER_MODE=live
UBER_ENABLED=true
UBER_CLIENT_ID=...
UBER_CLIENT_SECRET=...
```

- At least one provider must be enabled. None enabled → the app refuses to
  start.
- Every enabled provider must have both credentials; a blank value counts as
  missing. The startup error names the provider and the missing variables, never
  a value.
- Credentials go in `backend/.env` locally (gitignored) or your platform's secret
  store in deployment. Never commit them, and never put them in the app bundle —
  the app only ever sees `EXPO_PUBLIC_*` values.

### Why live mode is not production-ready

`PROVIDER_MODE=live` is a validated configuration path, not a working quoting
pipeline. Today:

- `RapidoAdapter`, `UberAdapter` and `OlaAdapter` make **no HTTP requests**. They
  raise `ProviderNotConfiguredError`, which surfaces as
  `"status": "not_configured"`.
- Their capability declarations are deliberately unknown (`null` in the domain:
  `None`): tier list, coordinate requirement and quote-expiry support for each
  provider are unverified in this repository.
- The concurrency, timeout, isolation and capability logic has only ever been
  exercised with fakes. Real provider behaviour — auth refresh, rate limits,
  error shapes, latency — is untested.
- There is no logging or metrics, so a live deployment could not be diagnosed.
- The service has no authentication of its own and is intended for local
  development.

Because a provider must have credentials to be enabled at all, "enabled but
unconfigured" is a startup error rather than a response. What a live comparison
returns today is `200` with `"source": "provider-api"`, an empty `estimates`
list, and one honest `providerStates` entry per enabled provider, each
`"status": "not_configured"` (the skeletons raise before any call is made). It
never falls back to demo fares — verified against the running app in Stage 4.

## Adding an authorised provider adapter

1. Confirm authorised API access and documented endpoints for the provider. Do
   not scrape a private API, replay an app token, invent an endpoint, or fabricate
   a required parameter (for example Ola's affiliate `utm_source`).
2. Implement `compare()` in the provider's module under
   `app/services/fares/providers/`, following the rules in `base.py`: only the
   requested categories, `QuoteStatus.UNSUPPORTED` for a tier the provider does
   not serve, no FastAPI types, no credential or response body in an exception.
3. Replace that adapter's `None` capability values with **verified** facts. Leave
   anything unverified as `None`.
4. Wire it into `PROVIDER_SPECS` in `registry.py` if it needs a new credential
   name, and document the variables in `.env.example` (empty values).
5. Add tests that need no credentials: adapter mapping against sanitised fixtures,
   plus a missing-credential case that still yields `not_configured`.
6. Keep `PROVIDER_MODE=demo` as the default. Flip to `live` only once an
   end-to-end run has been validated against the app.

The route, schemas, ordering, timeouts and `providerStates` need no changes to
admit a new adapter.
