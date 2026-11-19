# RideCompare Backend

FastAPI service that will eventually hold server-side provider integrations for
RideCompare. **This is a foundation only:** the single endpoint is a health
check. There are no fare calculations, no database, no authentication and no
Rapido/Uber/Ola API calls. All fares in the mobile app are still the demo
estimates that ship in the app bundle.

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
    main.py                 # create_app() factory + CORS + router wiring
    api/routes/health.py    # GET /health
    core/config.py          # Settings (env vars, CORS validation)
    schemas/health.py       # HealthResponse model
  tests/
    test_health.py          # payload, app name, method guard, CORS preflight
    test_config.py          # origin parsing and wildcard rejection
  .env.example
  pytest.ini
  requirements.txt          # runtime
  requirements-dev.txt      # runtime + tests
```

New endpoints belong in `app/api/routes/` as their own module, with request and
response models under `app/schemas/`, and are registered in `app/main.py`.

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

## Run the tests

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
```

`pytest.ini` sets `testpaths = tests` and puts `backend/` on `sys.path`, so the
tests import `app.*` while picking up `backend/.env` when it exists.

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
