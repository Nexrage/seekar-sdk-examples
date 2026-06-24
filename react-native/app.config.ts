import type { ExpoConfig } from "expo/config"

// Build-time environment. Expo automatically loads `.env` files (see
// .env.example). These values are surfaced to the running app via `extra`.
//
// Note: there are no ReactVision keys here. The SeekAR SDK fully encapsulates
// ReactVision Viro — including its credentials and native build config — via
// its Expo config plugin (added below). The app never sees those keys.
const API_URL = process.env.API_URL || "https://www.seekar.io/api"
const SHOW_RADIUS_CIRCLES = process.env.SHOW_RADIUS_CIRCLES ?? ""
// SeekAR license key, baked into the build (see .env.example). At startup the
// SDK transmits it to the license server to confirm validity (§5.1).
const SEEKAR_LICENSE_KEY = process.env.SEEKAR_LICENSE_KEY ?? ""
// License server base URL. Defaults to the live dev server on AKS; the SDK
// appends /v1/checkin. Prod is https://license.seekar.io. For the local stub
// (seekar-sdk `npm run license-stub`) use http://<your-LAN-ip>:8787.
const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL ?? "https://license-dev.seekar.io"
// Full check-in URL override (only for an echo mock). Empty by default so the
// SDK builds the URL from LICENSE_SERVER_URL + /v1/checkin.
const LICENSE_CHECKIN_URL = process.env.LICENSE_CHECKIN_URL ?? ""
// Mock mode: treat any 2xx as approved (for an offline echo mock). Off by
// default now that the real dev server is live.
const LICENSE_MOCK = process.env.LICENSE_MOCK ?? "false"

const config: ExpoConfig = {
  name: "SeekAR Demo",
  slug: "seekar-demo",
  scheme: "seekardemo",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/app-icon.jpg",
  splash: {
    backgroundColor: "#0b0b12",
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "io.seekar.demo",
    config: {
      usesNonExemptEncryption: false,
    },
  },

  android: {
    package: "io.seekar.demo",
    edgeToEdgeEnabled: true,
  },

  plugins: [
    "expo-router",
    "expo-audio",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "SeekAR Demo needs location access to place location-based AR collectibles.",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: "SeekAR Demo needs camera access to display AR collectibles.",
        microphonePermission: "SeekAR Demo may need microphone access for AR capture.",
      },
    ],
    // SeekAR SDK — encapsulates ALL ReactVision Viro native setup: New
    // Architecture (Fabric), AR permissions + iOS usage strings, the baked
    // ReactVision RVApiKey/RVProjectId, and the iOS dynamic-frameworks /
    // Android minSdk build properties. The app installs nothing from
    // ReactVision and configures no keys.
    //
    // Resolved as the installed package (consumed via the local `file:` link in
    // package.json — the real end-user form). This is exactly what a consumer
    // app writes after installing @seekar/react-native from the registry.
    "@seekar/react-native",
    [
      // App-specific build property the SDK does not own: react-native-maps
      // does not link React-Core under Viro's dynamic frameworks (undefined
      // RCT* symbols at link time), so force it (and the Google Maps impl) to
      // static linking. expo-build-properties merges across invocations, so
      // this composes with the SeekAR plugin's iOS settings.
      "expo-build-properties",
      {
        ios: {
          forceStaticLinking: ["react-native-maps", "react-native-google-maps"],
        },
      },
    ],
  ],

  extra: {
    // Surfaced to the running app via expo-constants (see src/seekar/env.ts).
    apiUrl: API_URL,
    showRadiusCircles: SHOW_RADIUS_CIRCLES,
    seekarLicenseKey: SEEKAR_LICENSE_KEY,
    licenseServerUrl: LICENSE_SERVER_URL,
    licenseCheckInUrl: LICENSE_CHECKIN_URL,
    licenseMock: LICENSE_MOCK,
  },
}

export default config
