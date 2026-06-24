/**
 * Runtime environment for the demo, sourced from `app.config.ts` -> `extra`.
 * Values flow: `.env` -> app.config.ts (build time) -> Constants.extra (runtime).
 */
import Constants from "expo-constants"

type SeekarExtra = {
  apiUrl?: string
  showRadiusCircles?: string
  seekarLicenseKey?: string
  licenseServerUrl?: string
  licenseCheckInUrl?: string
  licenseMock?: string
}

const extra = (Constants.expoConfig?.extra ?? {}) as SeekarExtra

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback
  return /^(1|true|yes|on)$/i.test(value.trim())
}

/** SeekAR REST API base URL, e.g. `https://www.seekar.io/api`. */
export const API_URL = extra.apiUrl || "https://www.seekar.io/api"

/**
 * SeekAR license key, baked into the build at build time (`.env` ->
 * `SEEKAR_LICENSE_KEY`). Passed to `initializeSeekAR` so the SDK can confirm
 * validity + subscription with the license server (§5.1). Empty in the demo
 * unless provided.
 */
export const SEEKAR_LICENSE_KEY = extra.seekarLicenseKey || ""

/**
 * License server base URL (`.env` -> `LICENSE_SERVER_URL`). Defaults to the live
 * dev server (`https://license-dev.seekar.io`); the SDK appends `/v1/checkin`.
 */
export const LICENSE_SERVER_URL = extra.licenseServerUrl || ""

/**
 * Full check-in URL override (`.env` -> `LICENSE_CHECKIN_URL`). Empty by default;
 * set only when pointing at an echo mock instead of a real server.
 */
export const LICENSE_CHECKIN_URL = extra.licenseCheckInUrl || ""

/**
 * Mock mode (`.env` -> `LICENSE_MOCK`): treat any 2xx check-in as approved. Off
 * by default now that the live dev server is available; enable for offline dev.
 */
export const LICENSE_MOCK = parseBoolean(extra.licenseMock, false)

/**
 * Map debug overlay toggle (`.env` -> `SHOW_RADIUS_CIRCLES`): draw the
 * green/amber collect-radius circles around each collectible on the map.
 * Disabled unless explicitly enabled.
 */
export const SHOW_RADIUS_CIRCLES = parseBoolean(extra.showRadiusCircles, false)

/**
 * Host root for non-`/api` paths (notably the asset proxy). Derived by
 * stripping a trailing `/api` from the API base, mirroring the reference app's
 * `getBaseUrl()` in assetDecryption.ts.
 */
export function getApiHost(): string {
  if (API_URL.endsWith("/api")) return API_URL.slice(0, -4)
  return API_URL || "https://www.seekar.io"
}
