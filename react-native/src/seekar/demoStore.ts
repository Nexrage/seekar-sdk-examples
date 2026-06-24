/**
 * Demo session store.
 *
 * The SeekAR backend enforces a real-world geofence on collection (you must be
 * physically within a collectible's radius), so a self-contained product demo
 * can't rely on it to guarantee "everything is collectable from where you're
 * standing". Instead this store:
 *
 *   1. Spawns a random 5-10 collectibles *around the user's current location*
 *      with controlled radii — at least 5 placed inside their radius (collect
 *      immediately) and the rest with tight radii a short walk away.
 *   2. Tracks what the user has collected for this session (client-side) so the
 *      "Collected" tab is reliable regardless of backend geofence state.
 *
 * Real collectibles (ids + AR assets/animation/audio) are still sourced from
 * the live API so the AR experience renders genuine SeekAR content; only their
 * coordinates/radius are overridden for the demo.
 */
import { useSyncExternalStore } from "react"
import type { Collectible } from "./types"
import { haversineMeters, offsetLatLng, type LatLng } from "./geo"

export interface DemoCollectible extends Collectible {
  /** Demo radius in meters (also mirrored onto `radius`). */
  demoRadius: number
  /** Distance (m) from the user at spawn time. */
  spawnDistanceM: number
  /** True if spawned already inside its radius (immediately collectible). */
  immediate: boolean
}

interface DemoState {
  generated: boolean
  collectibles: DemoCollectible[]
  /** id -> epoch ms when collected. */
  collectedAt: Record<string, number>
}

const MIN_TOTAL = 5
const MAX_TOTAL = 10
const MIN_IMMEDIATE = 5

// Immediate items: large radius, spawned a few meters away -> already in range.
const IMMEDIATE_RADIUS_M: [number, number] = [60, 120]
const IMMEDIATE_DISTANCE_M: [number, number] = [4, 25]

// Walk items: tight radius, spawned farther away -> must walk closer.
const WALK_RADIUS_M: [number, number] = [8, 20]
const WALK_DISTANCE_M: [number, number] = [55, 160]

let state: DemoState = { generated: false, collectibles: [], collectedAt: {} }
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function setState(next: DemoState) {
  state = next
  emit()
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randInt(min: number, max: number): number {
  return Math.floor(randBetween(min, max + 1))
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The asset that distinguishes one collectible's AR content from another. */
function assetKey(c: Collectible): string {
  return c.asset?.id ?? `no-asset:${c.id}`
}

function isImageAsset(c: Collectible): boolean {
  return (c.asset?.type ?? "").toUpperCase() === "IMAGE"
}

/**
 * Pick a varied set of source collectibles, one per distinct AR asset before
 * any asset repeats. The live catalog is heavily skewed (~74% share a single
 * 3D model), so a naive random sample renders an all-identical demo. Grouping
 * by asset — and seeding 2D IMAGE assets first — guarantees the demo showcases
 * different models AND at least one flat image whenever the pool contains them.
 */
function pickVariedSources(distinct: Collectible[], total: number): Collectible[] {
  const buckets = new Map<string, Collectible[]>()
  for (const c of distinct) {
    const key = assetKey(c)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(c)
    else buckets.set(key, [c])
  }

  const allBuckets = [...buckets.values()]
  const isImageBucket = (b: Collectible[]) => b.length > 0 && isImageAsset(b[0])
  // IMAGE assets first (so one is included before the slot budget runs out),
  // then everything else — both shuffled for run-to-run variety.
  const orderedBuckets = [
    ...shuffle(allBuckets.filter(isImageBucket)),
    ...shuffle(allBuckets.filter((b) => !isImageBucket(b))),
  ]

  // Round-robin across asset buckets: round 0 takes one collectible per
  // distinct asset (maximizing variety); later rounds backfill from buckets
  // that have more, only once every asset has been represented.
  const picked: Collectible[] = []
  for (let round = 0; picked.length < total; round++) {
    let advanced = false
    for (const bucket of orderedBuckets) {
      if (bucket.length > round) {
        picked.push(bucket[round])
        advanced = true
        if (picked.length >= total) break
      }
    }
    if (!advanced) break
  }
  return picked
}

/**
 * Build the demo collectible set from a source pool of real collectibles and
 * the user's current location. Pure: callers commit the result via
 * `setDemoCollectibles`.
 */
export function buildDemoCollectibles(user: LatLng, pool: Collectible[]): DemoCollectible[] {
  // Need distinct source ids so collection/AR stay 1:1 with a real collectible.
  const seen = new Set<string>()
  const distinct = shuffle(pool).filter((c) => {
    if (!c.id || seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })

  if (distinct.length === 0) return []

  const total = Math.min(distinct.length, randInt(MIN_TOTAL, MAX_TOTAL))

  // Select for asset variety, then shuffle so map placement (immediate vs a
  // short walk) isn't correlated with the variety ordering.
  const sources = shuffle(pickVariedSources(distinct, total))

  // At least MIN_IMMEDIATE immediate (or all of them if the set is small).
  const immediateCount =
    sources.length <= MIN_IMMEDIATE ? sources.length : randInt(MIN_IMMEDIATE, sources.length)

  return sources.map((source, index) => {
    const immediate = index < immediateCount
    const radius = immediate
      ? randBetween(IMMEDIATE_RADIUS_M[0], IMMEDIATE_RADIUS_M[1])
      : randBetween(WALK_RADIUS_M[0], WALK_RADIUS_M[1])
    const distance = immediate
      ? randBetween(IMMEDIATE_DISTANCE_M[0], IMMEDIATE_DISTANCE_M[1])
      : randBetween(WALK_DISTANCE_M[0], WALK_DISTANCE_M[1])
    const bearing = randBetween(0, 360)
    const placed = offsetLatLng(user, distance, bearing)

    return {
      ...source,
      lat: placed.lat,
      lng: placed.lng,
      radius: Math.round(radius),
      demoRadius: Math.round(radius),
      spawnDistanceM: Math.round(distance),
      immediate,
      // Force the geospatial (outdoor) AR path in the viewer.
      environment: "OUTDOOR",
    }
  })
}

export function setDemoCollectibles(collectibles: DemoCollectible[]) {
  setState({ ...state, generated: true, collectibles })
}

export function isGenerated(): boolean {
  return state.generated
}

/** Clear the session so the next map visit re-spawns a fresh random set. */
export function resetDemo() {
  setState({ generated: false, collectibles: [], collectedAt: {} })
}

export function getDemoCollectible(id: string | undefined): DemoCollectible | undefined {
  if (!id) return undefined
  return state.collectibles.find((c) => c.id === id)
}

export function markCollected(id: string) {
  if (!id || state.collectedAt[id]) return
  setState({ ...state, collectedAt: { ...state.collectedAt, [id]: Date.now() } })
}

export function isCollected(id: string | undefined): boolean {
  return id ? state.collectedAt[id] != null : false
}

/**
 * Distance label / range check against a live user location, computed from the
 * collectible's spawned coordinates + demo radius.
 */
export function distanceToUser(c: DemoCollectible, user: LatLng | null): number | null {
  if (!user || c.lat == null || c.lng == null) return null
  return haversineMeters(user, { lat: c.lat, lng: c.lng })
}

export function isInRange(c: DemoCollectible, user: LatLng | null): boolean {
  const d = distanceToUser(c, user)
  if (d == null) return c.immediate
  return d <= c.demoRadius
}

// ---------------------------------------------------------------------------
// React binding
// ---------------------------------------------------------------------------

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): DemoState {
  return state
}

/** Subscribe a component to the full demo state. */
export function useDemoStore(): DemoState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
