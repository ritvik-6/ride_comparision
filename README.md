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
    index.tsx           # Home: map-first "Plan your ride" + manual search
    map.tsx             # Map-first route planner
    compare.tsx         # Fare comparison
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
  services/geocoding/
    types.ts            # GeocodingProvider interface + error kinds and copy
    photonMapping.ts    # Pure URL building and Photon GeoJSON parsing
    photon.ts           # Photon adapter: fetch, timeout, cancellation, cache
    index.ts            # getGeocodingProvider() — the single swap point
  services/location/currentLocation.ts # expo-location permission + geocoding
  services/routing/
    types.ts            # RoutingProvider interface + error kinds and copy
    osrmMapping.ts      # Pure OSRM URL building and response parsing
    osrm.ts             # OSRM adapter: fetch, timeout, cancellation
    index.ts            # getRoutingProvider() — the single swap point
  hooks/useRoutePlan.ts # Calculates the driving route for the current pair
  utils/mapLocations.ts # MapLocation ⇄ Place conversion
  utils/routeMetrics.ts # Route metric validation and formatting
  utils/routeBounds.ts  # Bounding box used to frame the route
  hooks/usePlaceSuggestions.ts # Debounced autocomplete state
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
| `EXPO_PUBLIC_GEOCODING_BASE_URL` | Optional geocoding origin; defaults to the public Photon instance |
| `EXPO_PUBLIC_ROUTING_BASE_URL` | Optional routing origin; defaults to the public OSRM server |
| `EXPO_PUBLIC_APP_ENV` | `development` / `production` label |

Read them through `src/config/env.ts` (`env.apiBaseUrl`, `isApiConfigured`) rather
than touching `process.env` directly, so missing config degrades gracefully.
`.env` is gitignored; `.env.example` is committed.

## Map and place search

Rides are planned on the map: `/map` opens full-screen, tap anywhere to drop a
pin, or search for a real place. Pickup and destination are stored as
`MapLocation` (`src/types/location.ts`): latitude, longitude, display name,
formatted address, optional place id and the source (`gps` | `map` | `search`).
They convert to the existing `Place` shape on the way to `/compare`, so the
comparison screen, provider links and backend contract are unchanged.

### Geocoding provider

The app uses **[Photon](https://photon.komoot.io/)** — an OpenStreetMap geocoder
built for search-as-you-type that also reverse geocodes, so one provider covers
autocomplete and map taps.

| Aspect | Detail |
| --- | --- |
| Key required | **No** — works with no signup for development |
| Public instance | `https://photon.komoot.io` |
| Usage policy | Fair use. Heavy traffic is throttled or blocked, and availability is not guaranteed |
| Free tier | No quota or paid plan; it is a demo server, not a commercial API |
| Commercial use | Not suitable as-is: run your own Photon instance or put a keyed provider behind the same interface |

What the app does to stay within that policy: no request for queries shorter
than 3 characters, a 450 ms debounce, one in-flight request at a time (cancelled
when the query changes), an 8-second timeout, and a small per-query result cache.

To use another host, set `EXPO_PUBLIC_GEOCODING_BASE_URL` (no trailing slash).
Nothing else changes: every screen calls `getGeocodingProvider()` from
`src/services/geocoding/index.ts`, so swapping to a keyed service or a backend
proxy is a change to one file plus an adapter implementing `GeocodingProvider`
(`suggest()` and `reverse()`).

Public Nominatim is deliberately not used — its usage policy forbids
autocomplete, and this app needs typeahead.

## Route calculation and drawing

Once both ends are chosen, `useRoutePlan` asks the routing service for a driving
route and the map draws it. The route is recalculated whenever pickup or
destination changes, and the camera is fitted to the whole geometry with padding
that keeps both markers clear of the floating panel.

| Aspect | Detail |
| --- | --- |
| Provider | **[OSRM](https://project-osrm.org/)** public demo server, `router.project-osrm.org` |
| Key required | **No** |
| Usage policy | Free shared service; the project asks for light use and throttles abuse. No availability guarantee |
| Commercial use | Not suitable as-is: self-host OSRM and set `EXPO_PUBLIC_ROUTING_BASE_URL` |

One request is sent per completed route — nothing while an end is still being
chosen, nothing on camera moves, and the in-flight request is aborted when the
route changes. Requests time out after 9 seconds.

Loading, timeout, network failure, an unroutable pair and a malformed response
each have their own message in the route panel. **Nothing ever substitutes a
straight-line distance or a made-up duration**: if routing fails, no geometry is
drawn, `route` is omitted from the fare request, and both the map panel and the
comparison screen say the fares are not based on a driving distance.

Swapping the provider means writing one adapter for `RoutingProvider` and
changing `src/services/routing/index.ts`; nothing in the UI knows about OSRM.

### GPS behaviour

- Permission is **never** requested when the map opens. On mount the app only
  reads an existing permission (`getForegroundPermissionsAsync`) and, if it was
  already granted and a fix resolves, uses it silently as pickup.
- Otherwise pickup starts empty and both ends are chosen from the map or search.
- **Use current location** in the search panel triggers the real request and
  reuses the existing `expo-location` flow: denied, permanently denied (with an
  Open settings link), GPS off, timeout and reverse-geocode failures all have
  their own message.
- A mapped tap whose address cannot be resolved shows an error and retry rather
  than inventing an address.

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

The measured road route travels with the trip: `/map` passes `routeDistanceKm`
and `routeDurationMinutes` to `/compare` as router params, and the fare request
carries them as an optional `route` object. The backend prices its demo offers
from that distance and duration; when the route is missing the field is omitted
and the backend falls back to its previous id-keyed sample variation. Either way
the numbers are **RideCompare demo estimates**, never live provider quotes.

Everything visual — badges, sort control, category chips, unavailable rows,
provider hand-off links and the demo-estimates disclosure — is unchanged and
operates on whatever the server returns.

`src/services/fares/demoFares.ts` no longer feeds the screen. It stays as the
reference implementation that the backend's demo generator is parity-tested
against (`backend/tests/fixtures/`), so the two cannot drift.

## Verified

- `npx tsc --noEmit` — clean
- `npx expo lint` — clean
- `npm test` — 77 Node tests (link URLs, fare contract mapping/validation/errors,
  map-location conversion, map tap extraction, Photon and OSRM URL building and
  response parsing, route metric validation and camera framing)
- `npx expo export --platform android` — bundles
- `backend: pytest` — 222 tests
- Request mapping and response parsing exercised against the running backend
  (`HTTP 200`, nine estimates, unavailable Rapido cab preserved)
- Not yet exercised on an emulator or device: the in-app loading, error and
  retry states, map tile rendering, map tap selection, route drawing and camera
  fitting, and the live Photon/OSRM requests (their mapping is unit-tested, the
  network path is not)
