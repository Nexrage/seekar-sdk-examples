/**
 * Lightweight geo math for the demo's map + placement logic.
 *
 * Kept self-contained (rather than reaching into SDK internals) so the demo
 * owns its own units and formatting.
 */

export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_M = 6_371_000
const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

/** Great-circle distance between two coordinates, in meters. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD
  const dLng = (b.lng - a.lng) * DEG_TO_RAD
  const lat1 = a.lat * DEG_TO_RAD
  const lat2 = b.lat * DEG_TO_RAD

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Offset an origin coordinate by `distanceMeters` along `bearingDeg`
 * (0 = north, 90 = east). Used to scatter demo collectibles around the user.
 */
export function offsetLatLng(origin: LatLng, distanceMeters: number, bearingDeg: number): LatLng {
  const angular = distanceMeters / EARTH_RADIUS_M
  const bearing = bearingDeg * DEG_TO_RAD
  const lat1 = origin.lat * DEG_TO_RAD
  const lng1 = origin.lng * DEG_TO_RAD

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing)
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2)
    )

  return { lat: lat2 * RAD_TO_DEG, lng: lng2 * RAD_TO_DEG }
}

/** Human-friendly distance label (e.g. "12 m", "1.4 km"). */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "—"
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`
}
