# RideCompare Backend

FastAPI service for RideCompare. **Demo data only:** the fare endpoint returns
deterministic sample estimates ported from the mobile app. There is no database,
no authentication, and no Rapido/Uber/Ola API call anywhere in this service. The
app still renders its own bundled demo estimates; it does not call this API yet.

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
    api/routes/health.py       # GET /health
    api/routes/fares.py        # POST /api/v1/fares/compare
    core/config.py             # Settings (env vars, CORS validation)
    schemas/health.py          # HealthResponse model
    schemas/fares.py           # request/response models (camelCase aliases)
    services/fares/            # pure demo fare generation, no FastAPI imports
    services/fares/demo_fares.py
  tests/
    test_health.py             # payload, app name, method guard, CORS preflight
    test_config.py             # origin parsing and wildcard rejection
    test_demo_fares.py         # offer table, determinism, TypeScript parity
    test_fares_api.py          # endpoint, validation, CORS
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

CORS is allow-listed from `CORS_ORIGINS`; a `*` wildcard is rejected at startup,
as is a value without a scheme and host. Origins apply to browsers only — the
Android app is not subject to CORS. Add your Expo web or LAN origin (for example
`http://192.168.1.20:8081`) to `CORS_ORIGINS` if you develop in a browser.

Note that Android emulators reach the host machine at `10.0.2.2`, and physical
devices need your machine's LAN IP; that is a client-side base-URL concern for a
later phase, not something this service configures.
