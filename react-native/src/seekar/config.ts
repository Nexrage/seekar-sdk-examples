/**
 * Installs the SeekAR SDK configuration into its module-level registry and
 * performs the license check-in.
 *
 * Imported for side effects from app/_layout.tsx so it runs once at startup,
 * before any AR view mounts. The SDK reads this config from a singleton (not
 * React context) because Viro scenes render in a separate renderer root.
 */
import { configureSeekAR, initializeSeekAR } from "@nexrage/react-native"
import { seekarAssetResolver } from "./assetResolver"
import { seekarAudioAdapter } from "./audio"
import {
  LICENSE_CHECKIN_URL,
  LICENSE_MOCK,
  LICENSE_SERVER_URL,
  SEEKAR_LICENSE_KEY,
} from "./env"

configureSeekAR({
  assetResolver: seekarAssetResolver,
  audio: seekarAudioAdapter,
  // particleImageSource is omitted — the SDK's bundled sparkle is used. Provide
  // a `require(...)`/`{ uri }` here to rebrand the AR placement effects.
})

// License check-in (spec §5.1). The key is a JWT baked into the build (see
// app.config.ts -> extra.seekarLicenseKey), presented to the license server as a
// Bearer token. A successful check-in returns a lease the SDK caches; offline it
// honors the lease for the 14-day grace window (hard-fail at 30 days).
//
// Points at the live dev license server (https://license-dev.seekar.io) by
// default. Set LICENSE_MOCK=true (+ a LICENSE_CHECKIN_URL echo mock or the local
// stub) only for fully-offline development.
//
// NOTE: no `secureStore` is injected here, so the SDK uses a non-persistent
// in-memory cache (it warns once). For production, inject a SeekARSecureStore
// backed by `expo-secure-store` so offline grace survives restarts.
initializeSeekAR(SEEKAR_LICENSE_KEY, {
  product: "rn",
  ...(LICENSE_SERVER_URL ? { licenseServerUrl: LICENSE_SERVER_URL } : {}),
  ...(LICENSE_CHECKIN_URL ? { licenseCheckInUrl: LICENSE_CHECKIN_URL } : {}),
  mockMode: LICENSE_MOCK,
  onStatusChange: (status) => {
    // eslint-disable-next-line no-console
    console.log(`[seekar-demo] license status: ${status.phase} (entitled=${status.entitled})`)
  },
})
