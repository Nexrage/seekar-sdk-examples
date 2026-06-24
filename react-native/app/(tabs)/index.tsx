import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import MapView, { Circle, type Region } from "react-native-maps"
import * as Location from "expo-location"
import { Ionicons } from "@expo/vector-icons"
import { listAvailableCollectibles } from "@/src/seekar/api"
import { SHOW_RADIUS_CIRCLES } from "@/src/seekar/env"
import {
  buildDemoCollectibles,
  setDemoCollectibles,
  isGenerated,
  isInRange,
  useDemoStore,
  type DemoCollectible,
} from "@/src/seekar/demoStore"
import type { LatLng } from "@/src/seekar/geo"
import { CollectibleMapMarker } from "./components/CollectibleMapMarker"

const ACCENT = "#00FF88"
const WALK = "#FFB020"

export default function MapScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const mapRef = useRef<MapView | null>(null)

  const store = useDemoStore()
  const [permission, requestPermission] = Location.useForegroundPermissions()
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const didFitRef = useRef(false)

  // Ask for location up front — the whole demo is location-based.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission()
    }
  }, [permission, requestPermission])

  // One-time: get a fix, then spawn the demo collectibles around the user.
  const spawn = useCallback(async () => {
    setError(null)
    setGenerating(true)
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const user: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setUserLocation(user)

      if (!isGenerated()) {
        // Pull a wide page so the pool spans the whole catalog. The live data
        // is dominated by one shared 3D asset (~74% the same model), and the
        // first items the API returns are all that asset — a small page would
        // yield an all-identical demo. buildDemoCollectibles diversifies by
        // asset from whatever pool it's given.
        const res = await listAvailableCollectibles({ pageSize: 200 })
        const built = buildDemoCollectibles(user, res.data)
        if (built.length === 0) {
          setError("No collectibles available to place on the map right now.")
          return
        }
        setDemoCollectibles(built)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not determine your location.")
    } finally {
      setGenerating(false)
    }
  }, [])

  useEffect(() => {
    if (permission?.granted && !store.generated && !generating && !error) {
      void spawn()
    }
  }, [permission?.granted, store.generated, generating, error, spawn])

  // Live location: keep distances/in-range state fresh as the user walks.
  useEffect(() => {
    if (!permission?.granted) return
    let sub: Location.LocationSubscription | null = null
    let cancelled = false
    ;(async () => {
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 },
        (pos) => {
          if (cancelled) return
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        }
      )
    })()
    return () => {
      cancelled = true
      sub?.remove()
    }
  }, [permission?.granted])

  const initialRegion: Region | undefined = useMemo(() => {
    if (!userLocation) return undefined
    return {
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      latitudeDelta: 0.006,
      longitudeDelta: 0.006,
    }
  }, [userLocation])

  // Fit all spawned markers + the user into view once, after generation.
  useEffect(() => {
    if (didFitRef.current || !userLocation || store.collectibles.length === 0 || !mapRef.current) {
      return
    }
    const coords = [
      { latitude: userLocation.lat, longitude: userLocation.lng },
      ...store.collectibles
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => ({ latitude: c.lat as number, longitude: c.lng as number })),
    ]
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 120, right: 80, bottom: 200, left: 80 },
        animated: true,
      })
      didFitRef.current = true
    }, 350)
    return () => clearTimeout(t)
  }, [store.collectibles, userLocation])

  const recenter = useCallback(() => {
    if (!userLocation) return
    mapRef.current?.animateToRegion(
      {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      },
      350
    )
  }, [userLocation])

  const openAr = useCallback(
    (c: DemoCollectible) => {
      router.push({ pathname: "/ar", params: { id: c.id, instanceId: c.instanceId ?? "" } })
    },
    [router]
  )

  const collectedCount = useMemo(
    () => store.collectibles.filter((c) => store.collectedAt[c.id] != null).length,
    [store.collectibles, store.collectedAt]
  )

  // --- Gates ---------------------------------------------------------------
  if (!permission) {
    return <Centered>Checking location permission…</Centered>
  }

  if (!permission.granted) {
    return (
      <View style={styles.gate}>
        <Ionicons name="location" size={42} color={ACCENT} />
        <Text style={styles.gateTitle}>Location access needed</Text>
        <Text style={styles.gateBody}>
          SeekAR Demo places AR collectibles around your current location.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => void requestPermission()}>
          <Text style={styles.primaryBtnText}>Grant location access</Text>
        </Pressable>
      </View>
    )
  }

  if (!store.generated) {
    if (error) {
      return (
        <View style={styles.gate}>
          <Text style={styles.gateTitle}>Couldn’t set up the map</Text>
          <Text style={styles.gateBody}>{error}</Text>
          <Pressable style={styles.primaryBtn} onPress={() => void spawn()}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </Pressable>
        </View>
      )
    }
    return <Centered>Spawning collectibles around you…</Centered>
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {store.collectibles.map((c) => {
          if (c.lat == null || c.lng == null) return null
          const collected = store.collectedAt[c.id] != null
          const inRange = !collected && isInRange(c, userLocation)
          return (
            <View key={c.id}>
              {SHOW_RADIUS_CIRCLES && (
                <Circle
                  center={{ latitude: c.lat, longitude: c.lng }}
                  radius={c.demoRadius}
                  strokeColor={collected ? "rgba(120,120,140,0.4)" : inRange ? "rgba(0,255,136,0.7)" : "rgba(255,176,32,0.7)"}
                  fillColor={collected ? "rgba(120,120,140,0.08)" : inRange ? "rgba(0,255,136,0.12)" : "rgba(255,176,32,0.10)"}
                  strokeWidth={2}
                />
              )}
              <CollectibleMapMarker
                collectible={c}
                inRange={inRange}
                collected={collected}
                onPress={openAr}
              />
            </View>
          )
        })}
      </MapView>

      {/* Legend + progress */}
      <View style={[styles.banner, { top: insets.top + 8 }]}>
        <Text style={styles.bannerText}>
          {collectedCount}/{store.collectibles.length} collected
        </Text>
        <View style={styles.legendRow}>
          <Legend color={ACCENT} label="In range" />
          <Legend color={WALK} label="Walk closer" />
        </View>
      </View>

      <Pressable
        style={[styles.recenterBtn, { bottom: insets.bottom + 24 }]}
        onPress={recenter}
        hitSlop={10}
      >
        <Ionicons name="locate" size={22} color="#0b0b12" />
      </Pressable>
    </View>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={ACCENT} />
      <Text style={styles.dim}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b12" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b0b12",
    gap: 12,
  },
  dim: { color: "#8a8a99", fontSize: 14 },
  gate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b0b12",
    padding: 24,
    gap: 12,
  },
  gateTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 8 },
  gateBody: { color: "#c9c9d4", fontSize: 15, textAlign: "center" },
  primaryBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    marginTop: 8,
  },
  primaryBtnText: { color: "#0b0b12", fontWeight: "700", fontSize: 16 },
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "rgba(11,11,18,0.82)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  legendRow: { flexDirection: "row", gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: "#c9c9d4", fontSize: 12 },
  recenterBtn: {
    position: "absolute",
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
})
