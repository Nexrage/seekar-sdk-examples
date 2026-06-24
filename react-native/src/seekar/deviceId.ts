/**
 * Stable per-install device identifier.
 *
 * SeekAR's public endpoints are keyed by `deviceId` (no user login required for
 * the demo). We derive a stable id from the platform vendor id:
 *   - iOS: identifierForVendor (stable while any app from the vendor is installed)
 *   - Android: ANDROID_ID (stable per app-signing key + user)
 * Falls back to a process-lifetime random id if the platform id is unavailable.
 */
import { Platform } from "react-native"
import * as Application from "expo-application"

let cachedDeviceId: string | null = null

function randomId(): string {
  return "demo-" + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId
  try {
    if (Platform.OS === "ios") {
      cachedDeviceId = (await Application.getIosIdForVendorAsync()) || randomId()
    } else if (Platform.OS === "android") {
      cachedDeviceId = Application.getAndroidId() || randomId()
    } else {
      cachedDeviceId = randomId()
    }
  } catch {
    cachedDeviceId = randomId()
  }
  return cachedDeviceId
}
