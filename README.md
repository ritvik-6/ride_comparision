# RideCompare

Android-first ride-hailing price comparison app. Compare Rapido, Uber and Ola
fares in one place.

Pick a pickup and destination, then compare Bike, Auto and Cab estimates from
all three providers on one screen. Fares are **sample data** served by the local
FastAPI backend in [`backend/`](backend/README.md) — never live provider prices.
See [Running the app with the fares backend](#running-the-app-with-the-fares-backend-android).

## Stack

- Expo SDK 58 (React Native 0.88, React 19) with the New Architecture
- TypeScript (strict)
- Expo Router (file-based routing, typed routes enabled)
- `react-native-safe-area-context` for insets
- Styling: `StyleSheet` + centralized theme tokens

### Why not NativeWind

NativeWind v4.2.7 only lists support up to Expo SDK 57, and v5 is still a release
candidate, so it is not compatible with SDK 58 yet. Styling is done with
`StyleSheet` and tokens from `src/theme`, which is a drop-in migration path to
NativeWind later.

## Getting started

```bash
npm install
npm start            # Expo dev server
npm run android      # open on a connected Android device/emulator
npm run typecheck    # tsc --noEmit
npm run lint         # eslint-config-expo
```

Press `a` in the dev server to launch Android. Expo Go works because no custom
native modules have been added.

## Project structure

```
src/
  app/                  # Routes only — every file here is a screen
    _layout.tsx         # Root Stack, SafeAreaProvider, status bar
    index.tsx           # Home placeholder
  components/
    ui/AppText.tsx      # Themed typography (variant: display | title | body …)
    ui/Card.tsx         # Rounded surface card
    ui/Screen.tsx       # Safe-area page shell + responsive centered column
    ProviderChip.tsx    # Rapido / Uber / Ola identity pill
    index.ts
  config/env.ts         # Typed, safe access to EXPO_PUBLIC_* variables
  constants/
    app.ts              # App name, tagline, currency, locale
    providers.ts        # Static provider metadata (no fares)
  hooks/useTheme.ts     # Theme access hook
  hooks/useFareComparison.ts # Loads fares: loading / error / retry
  services/api/client.ts# JSON fetch wrapper + ApiError
  services/fares/
    faresContract.ts    # Request mapping, response validation, error copy
    faresApi.ts         # POST /api/v1/fares/compare
    demoFares.ts        # Reference implementation the backend is parity-tested against
  theme/
    colors.ts           # White canvas, near-black text, green accent
    spacing.ts          # 4pt spacing scale, radii, layout constants
    typography.ts       # Type scale and named text variants
  types/
    ride.ts             # RideProvider, RideOption, FareComparison, GeoPoint
    env.d.ts            # process.env typings
assets/                 # Icons and splash (root level, used by app.json)
```

Non-route code never lives inside `src/app`, so adding routes later stays cheap.
Imports use the `@/*` alias mapped to `src/*`.

## Design tokens

| Token | Value | Use |
| --- | --- | --- |
| `colors.background` | `#FFFFFF` | Page canvas |
| `colors.text` | `#0B0F0D` | Primary typography |
| `colors.textMuted` | `#5C6963` | Secondary text |
| `colors.accent` | `#0FA968` | Green accent |
| `colors.accentSoft` | `#E7F8EF` | Highlighted surfaces |
| `radius.xl` | `20` | Cards |
| `radius.pill` | `999` | Chips, buttons |
| `spacing` | 4–48 | 4pt rhythm |

`Screen` caps content at 560pt and centers it, so phones stay edge-appropriate
while tablets and foldables get a readable column.

## Environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Only `EXPO_PUBLIC_*` variables reach the bundle and they are inlined in
plain text — never put secrets there.

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Fares backend origin, e.g. `http://10.0.2.2:8000`; empty by default |
| `EXPO_PUBLIC_APP_ENV` | `development` / `production` label |

Read them through `src/config/env.ts` (`env.apiBaseUrl`, `isApiConfigured`) rather
than touching `process.env` directly, so missing config degrades gracefully.
`.env` is gitignored; `.env.example` is committed.

## Running the app with the fares backend (Android)

The comparison screen calls `POST <base>/api/v1/fares/compare` and shows nothing
when the server cannot be reached — it never falls back to locally generated
numbers.

**1. Start the backend** (leave it running):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` is what lets a physical phone reach the server; the emulator
works with the default host too.

**2. Point the app at it.** Copy `.env.example` to `.env` (first time only) and
set `EXPO_PUBLIC_API_BASE_URL` for your target:

| Run target | `EXPO_PUBLIC_API_BASE_URL` |
| --- | --- |
| Android emulator | `http://10.0.2.2:8000` |
| Physical Android phone | `http://192.168.x.x:8000` (your machine's LAN IP) |
| Expo web / iOS simulator | `http://localhost:8000` |

`10.0.2.2` is the emulator's alias for your machine's `localhost`; plain
`localhost` from inside the emulator points at the emulator itself. For a phone,
run `ipconfig` and use the Wi-Fi/Ethernet IPv4 address, with the phone on the same
network.

**3. Start Expo.** `EXPO_PUBLIC_*` values are inlined at bundle time, so restart
Metro after changing `.env`:

```powershell
npx expo start --clear
```

Open the app, choose a pickup and destination, and tap **Compare rides**. The
estimates now come from the server.

Notes:

- If you see **"No server configured"**, `.env` has no base URL or Metro was not
  restarted.
- If you see **"Can't reach the server"**, the backend is not running, the host
  is wrong, or a firewall is blocking port 8000. **Try again** retries the same
  route.
- A `422` becomes **"These locations were rejected"** — go back and reselect the
  places. Malformed responses show **"Unexpected response"** instead of
  rendering untrusted numbers.
- CORS applies to browsers only; add your Expo web origin to `CORS_ORIGINS` in
  `backend/.env` if you run in a browser. The Android app is not affected.

### Fare data flow

`compare.tsx` → `useFareComparison` → `faresApi.fetchFareComparison` →
`apiRequest` → `POST /api/v1/fares/compare` → validated by `faresContract` →
`rankFareEstimates` (filters, sorting, cheapest/fastest badges).

Everything visual — badges, sort control, category chips, unavailable rows,
provider hand-off links and the demo-estimates disclosure — is unchanged and
operates on whatever the server returns.

`src/services/fares/demoFares.ts` no longer feeds the screen. It stays as the
reference implementation that the backend's demo generator is parity-tested
against (`backend/tests/fixtures/`), so the two cannot drift.

## Verified

- `npx tsc --noEmit` — clean
- `npx expo lint` — clean
- `npm test` — 23 Node tests (link URLs, fare contract mapping/validation/errors)
- `npx expo export --platform android` — bundles
- `backend: pytest` — 76 tests
- Request mapping and response parsing exercised against the running backend
  (`HTTP 200`, nine estimates, unavailable Rapido cab preserved)
- Not yet exercised on an emulator or device: the in-app loading, error and
  retry states
