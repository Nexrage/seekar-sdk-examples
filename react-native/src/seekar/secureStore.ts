/**
 * `expo-secure-store`-backed {@link SeekARSecureStore} for the SeekAR license
 * cache.
 *
 * The SDK persists its encrypted license lease through an injected secure store
 * (Keychain on iOS / EncryptedSharedPreferences on Android). Without one it
 * falls back to a non-persistent in-memory cache, so offline grace is lost on
 * every app restart. This adapter maps the SDK's `getItem/setItem/removeItem`
 * contract onto Expo's `*Async` API so the lease survives relaunches.
 */
import * as SecureStore from "expo-secure-store"
import type { SeekARSecureStore } from "@nexrage/react-native"

export const seekarSecureStore: SeekARSecureStore = {
  getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key)
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value)
  },
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key)
  },
}
