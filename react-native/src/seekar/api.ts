/**
 * SeekAR REST API client (core happy-path subset).
 *
 * Base URL comes from app.config.ts -> extra.apiUrl (default
 * https://www.seekar.io/api). All endpoints used here are PUBLIC and keyed by a
 * device id, so no user authentication is required for the demo.
 *
 * Endpoints:
 *   GET  /collection/available-public      list nearby/available collectibles
 *   GET  /collection/get-collectible-by-id  full AR detail for one collectible
 *   GET  /collection/collected-ids          ids already collected (to filter)
 *   POST /collection/collect-public         collect a collectible
 */
import axios, { type AxiosInstance } from "axios"
import { API_URL } from "./env"
import { getDeviceId } from "./deviceId"
import type { Collectible, CollectResult, ListResponse } from "./types"

const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
})

/**
 * The server sometimes returns geo fields as latitude/longitude/proximityRadius
 * (notably get-collectible-by-id). Normalize to the lat/lng/radius the SDK and
 * the rest of the demo expect.
 */
export function normalizeCollectible(raw: Record<string, unknown>): Collectible {
  const lat = (raw.lat ?? raw.latitude) as number | null | undefined
  const lng = (raw.lng ?? raw.longitude) as number | null | undefined
  const radius = (raw.radius ?? raw.proximityRadius) as number | null | undefined
  return {
    ...(raw as unknown as Collectible),
    lat: lat ?? null,
    lng: lng ?? null,
    radius: radius ?? null,
  }
}

export interface ListAvailableParams {
  page?: number
  pageSize?: number
  status?: string
  excludeCollectedIds?: string
  worldId?: string
  experienceId?: string
}

/** GET /collection/available-public */
export async function listAvailableCollectibles(
  params: ListAvailableParams = {}
): Promise<ListResponse<Collectible>> {
  const deviceId = await getDeviceId()
  const res = await client.get<ListResponse<Record<string, unknown>>>(
    "/collection/available-public",
    {
      params: {
        deviceId,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 50,
        status: params.status,
        excludeCollectedIds: params.excludeCollectedIds,
        worldId: params.worldId,
        experienceId: params.experienceId,
      },
    }
  )
  const body = res.data
  return {
    data: (body?.data ?? []).map(normalizeCollectible),
    meta: body?.meta,
  }
}

export interface GetCollectibleParams {
  userLat?: number
  userLng?: number
  bypassGeofence?: boolean
}

/** GET /collection/get-collectible-by-id */
export async function getCollectibleById(
  collectibleId: string,
  params: GetCollectibleParams = {}
): Promise<Collectible> {
  const res = await client.get<Record<string, unknown>>(
    "/collection/get-collectible-by-id",
    {
      params: {
        collectibleId,
        userLat: params.userLat,
        userLng: params.userLng,
        bypassGeofence: params.bypassGeofence,
      },
    }
  )
  return normalizeCollectible(res.data)
}

/** GET /collection/collected-ids */
export async function getCollectedIds(): Promise<string[]> {
  const deviceId = await getDeviceId()
  const res = await client.get<{ ids?: string[] }>("/collection/collected-ids", {
    params: { deviceId },
  })
  return res.data?.ids ?? []
}

export interface CollectParams {
  collectibleId: string
  collectibleInstanceId?: string
  userLocation?: { lat: number; lng: number; accuracy?: number }
}

/** POST /collection/collect-public */
export async function collectPublic(params: CollectParams): Promise<CollectResult> {
  const deviceId = await getDeviceId()
  const res = await client.post<CollectResult>("/collection/collect-public", {
    collectibleId: params.collectibleId,
    collectibleInstanceId: params.collectibleInstanceId,
    deviceId,
    userLocation: params.userLocation,
  })
  return res.data
}

export { API_URL }
