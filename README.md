# RideCompare

Android-first ride-hailing price comparison app. Compare Rapido, Uber and Ola
fares in one place.

**Stage 1 — project initialization and architecture only.** No screens beyond the
home placeholder, no API calls, no backend.

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
  services/api/client.ts# JSON fetch wrapper for the future backend
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
| `EXPO_PUBLIC_API_BASE_URL` | Fare comparison backend origin; empty by default |
| `EXPO_PUBLIC_APP_ENV` | `development` / `production` label |

Read them through `src/config/env.ts` (`env.apiBaseUrl`, `isApiConfigured`) rather
than touching `process.env` directly, so missing config degrades gracefully.
`.env` is gitignored; `.env.example` is committed.

## Verified

- `npx tsc --noEmit` — clean
- `npx expo lint` — clean
- `npx expo export --platform android` — bundles (1137 modules)
- `npx expo-doctor` — 20/20 checks passed
- `npx expo start` — Metro starts on `http://localhost:8081`
