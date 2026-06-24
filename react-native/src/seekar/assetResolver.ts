/**
 * SeekAR asset resolver for the demo.
 *
 * SeekAR stores some 3D/audio assets as encrypted blobs whose `fileUrl` is a
 * `.txt` pointer on Azure Blob / the SeekAR CDN. Those must be fetched through
 * the server-side decrypting proxy at `{host}/api/asset-proxy/{assetId}`.
 * Plain URLs are returned unchanged.
 *
 * This mirrors `processModelUrl` from the reference app's
 * app-utils/assetDecryption.ts, ported to depend only on the demo env.
 */
import type { SeekARAssetResolver } from "@nexrage/react-native"
import { getApiHost } from "./env"

/** True when a URL is an encrypted SeekAR asset pointer (`.txt` blob/CDN). */
export function isEncryptedAssetUrl(url: string): boolean {
  if (!url) return false
  const isStorage =
    url.includes("blob.core.windows.net") || url.includes("cdn.seekar.io")
  return isStorage && url.endsWith(".txt")
}

/** Convert an asset's `fileUrl` into a directly loadable URL. */
export function processModelUrl(modelUrl: string, assetId?: string): string {
  if (!modelUrl) return ""
  if (assetId && isEncryptedAssetUrl(modelUrl)) {
    return `${getApiHost()}/api/asset-proxy/${assetId}`
  }
  return modelUrl
}

export const seekarAssetResolver: SeekARAssetResolver = {
  async resolveModelUri(modelUrl: string, assetId?: string): Promise<string | null> {
    const resolved = processModelUrl(modelUrl, assetId)
    return resolved || null
  },
  resolveProxyUrl(url: string, assetId?: string): string | null {
    const resolved = processModelUrl(url, assetId)
    return resolved || null
  },
}
