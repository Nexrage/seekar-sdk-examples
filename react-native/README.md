# SeekAR Demo — React Native (iOS + Android)

A single Expo app that consumes the `@nexrage/react-native` SDK as an installed
package to prove the core SeekAR AR collection flow on both iOS and Android:

**local map -> tap collectible -> geospatial/surface placement -> tap-to-collect**
(plus model animation, animation-synced audio cues, and collect feedback —
success overlay + sound + haptics).

It talks to the production SeekAR REST API (`https://www.seekar.io/api`) using the
public, `deviceId`-keyed endpoints — no user login required.

## Demo flow (map-first)

The app opens on a **native Apple Maps** home screen (a bottom-tab layout: **Map**
+ **Collected**). On first visit it spawns a random **5–10 collectibles around your
current location**, sourced from real API collectibles (real ids + AR assets) but
re-placed for the demo:

- **At least 5** are dropped *inside* their radius (green ring) — collectible
  immediately from where you stand.
- The rest get tight radii a short walk away (amber ring) — walk closer and the
  ring turns green.
- **Every item is collectable.** Tap any marker to open it in AR and collect it.

Because the SeekAR backend enforces a real-world geofence on collection (your
real GPS vs the collectible's real stored coordinates), the demo's *synthetic*
placements can't be collected through the live endpoint. So **collection is
tracked client-side for the session** (see `src/seekar/demoStore.ts`); collected
items populate the **Collected** tab, which shows an empty-state message until
you gather your first one. Restarting the app re-spawns a fresh random set.

## Architecture

```
app/
  _layout.tsx        Root Stack: (tabs) group + ar fullscreen modal
                     imports src/seekar/config (side effect)
  (tabs)/
    _layout.tsx      Bottom tabs: Map + Collected
    index.tsx        Map tab — Apple Maps, spawns + renders collectibles,
                     live distance/in-range, recenter, tap marker -> AR
    list.tsx         Collected tab — session-collected items (empty state)
    components/
      CollectibleMapMarker.tsx  thumbnail marker (in-range/walk/collected)
  ar.tsx             ARCollectionView shell -> SeekARView + tap-to-collect HUD
                     + collect success overlay (sound/haptics/animation)
assets/
  app-icon.jpg       App icon
  collect-effect.mp3 Collect SFX (played on a successful collect)
src/seekar/
  config.ts          configureSeekAR({ assetResolver, audio }) + initializeSeekAR
  assetResolver.ts   .txt encrypted assets -> {host}/api/asset-proxy/{assetId}
  audio.ts           ducking adapter (no-op-safe for the demo)
  api.ts             axios client + typed core endpoint wrappers
  demoStore.ts       session store: spawns demo collectibles around the user
                     + client-side collected tracking (useSyncExternalStore)
  geo.ts             haversine / offset / distance-format helpers
  deviceId.ts        stable per-install device id (vendor/ANDROID_ID)
  env.ts             reads app.config.ts -> extra
  types.ts           Collectible / Asset / AudioCue models
```

The map uses **`react-native-maps`** with the native **Apple Maps** provider on
iOS (no map API key required). It is a native module, so it needs a dev-client
rebuild — see Run below.

## Consuming the SDK (local link vs. published)

This example supports two consume modes (per the build workflow's local dev loop):

- **`local` (default for dev):** `@nexrage/react-native` is a local `file:` link
  to the sibling private SDK repo (`"@nexrage/react-native": "file:../../seekar-sdk"`
  in `package.json`). npm symlinks it into `node_modules`; `metro.config.js`
  follows the symlink and watches the SDK so rebuilds are picked up. The SDK's
  `prepare` script builds its `dist` on install. This requires both repos checked
  out side by side (`Projects/seekar-sdk` and `Projects/seekar-sdk-examples`).
- **`published` (release verification):** replace the `file:` link with the
  published version (e.g. `"@nexrage/react-native": "^0.2.0"`) from the private
  registry and reinstall. This is the real end-user path; verify it on a clean
  machine before release.

The app imports only from `@nexrage/react-native` — never from ReactVision/Viro,
which the SDK fully encapsulates.

## Prerequisites

- Node 20+, the Expo CLI (`npx expo`), Xcode (iOS) and/or Android Studio.
- A **physical device** with ARKit (iOS 17.6+) or ARCore (Android). AR does not
  run in the iOS Simulator / Android emulator, and Viro cannot run in Expo Go.

> **ReactVision credentials are handled inside the `@nexrage/react-native` SDK at
> build time and are invisible to this example.** The SDK's config plugin bakes
> the SeekAR-owned ReactVision key/project id into the native build, so the demo
> never sets, stores, or sees them — there are no ReactVision values in `.env`.

## Setup

Check out the private SDK repo (`seekar-sdk`) as a sibling of this repo, then:

```bash
cd react-native
cp .env.example .env          # then fill in
npm install                   # symlinks the local SDK and builds its dist
```

`.env`:

```
# SeekAR license key, baked into the build. Transmitted to
# https://license.seekar.io at startup to confirm validity (spec §5.1).
SEEKAR_LICENSE_KEY=your-key-here

# Override the SeekAR REST API base URL (defaults to production).
API_URL=https://www.seekar.io/api

# Map debug overlay: draw the green/amber collect-radius circles.
# true/1/yes/on to enable; anything else (or unset) disables.
SHOW_RADIUS_CIRCLES=true
```

## Run (custom dev client required)

Viro needs a custom native build, so generate native projects and run on device:

```bash
# Generate ios/ and android/ from app.config.ts
npx expo prebuild

# Build + launch on a connected device
npx expo run:ios --device
npx expo run:android --device
```

Then `npm start` to attach the Metro dev server.

> `react-native-maps` is a native module. If you're updating an existing dev
> client that predates the map, re-run `npx expo prebuild` + rebuild — a Metro
> reload alone won't pick it up. On iOS it renders Apple Maps (no API key).

## What to expect

1. The app opens on the **Map** tab (location permission is requested first) and
   spawns 5–10 collectibles around you — green rings are collectible now, amber
   rings are a short walk away. A banner shows your collected count.
2. Tapping a marker opens the AR screen (camera permission is requested there).
   The model is placed at the demo coordinates via ARCore/ARKit Geospatial.
3. The model reveals with particle effects, plays its animation + audio cues.
4. When you look at the collectible, **Collect** enables; tapping it (or the
   model) records the collection and plays the success overlay + sound + haptic.
   (Demo collections are tracked client-side — see Demo flow above.)
5. The **Collected** tab lists everything you've gathered this session; tap a row
   to view that collectible again in AR. It shows an empty-state message until
   you collect your first item.

## Audio + haptics notes

- The AR screen sets the iOS audio session via `setAudioModeAsync`
  (`playsInSilentMode: true`, `mixWithOthers`) so cues/SFX play over the camera
  session and through the silent switch. The collect SFX player uses
  `keepAudioSessionActive: true` and re-activates the session before playing,
  because the SDK's short AR cue players otherwise tear the session down.
- `expo-haptics` is a **native** module. If you add it (or any native module)
  after building, you must re-run `npx expo prebuild` + rebuild the dev client —
  a Metro reload is not enough. The code guards haptics so a missing native
  module no-ops instead of crashing.

## Typecheck

```bash
npm run typecheck
```
