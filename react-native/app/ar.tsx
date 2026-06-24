import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useCameraPermissions } from "expo-camera"
import * as Location from "expo-location"
import * as Haptics from "expo-haptics"
import { useAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio"
import { SeekARView, type SeekARViewProps } from "@seekar/react-native"
import { getCollectibleById, collectPublic } from "@/src/seekar/api"
import { getDemoCollectible, markCollected } from "@/src/seekar/demoStore"
import type { Collectible } from "@/src/seekar/types"

type CollectOutcome = { ok: boolean; title: string; subtitle?: string }

// Guarded haptics: expo-haptics is a native module, so this no-ops gracefully
// if the dev client hasn't been rebuilt since it was added. notificationAsync
// rejects as a promise when the native module is missing, so swallow that too.
function haptic(type: Haptics.NotificationFeedbackType) {
  try {
    const result = Haptics.notificationAsync(type) as unknown
    if (result && typeof (result as Promise<unknown>).catch === "function") {
      ;(result as Promise<unknown>).catch(() => {})
    }
  } catch {
    /* native module unavailable until the app is rebuilt */
  }
}

// The accuracy value the SDK reports via onAccuracyChanged (derived from the
// prop signature to avoid the SDK's dual value/type export of AccuracyLevel).
type AccuracyLevel = Parameters<NonNullable<SeekARViewProps["onAccuracyChanged"]>>[0]

const AR_ASSET_TYPES = ["MODEL_3D", "IMAGE", "VIDEO", "AUDIO"] as const
type ArAssetType = (typeof AR_ASSET_TYPES)[number]

function toArAssetType(type: string | undefined): ArAssetType {
  return (AR_ASSET_TYPES as readonly string[]).includes(type ?? "")
    ? (type as ArAssetType)
    : "MODEL_3D"
}

export default function ArScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id, instanceId } = useLocalSearchParams<{ id: string; instanceId?: string }>()

  // If this id was spawned by the map demo, we override its coordinates/radius
  // with the demo placement and record collection client-side.
  const demoEntry = useMemo(() => getDemoCollectible(id), [id])

  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [collectible, setCollectible] = useState<Collectible | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)

  // AR session state surfaced from the SDK callbacks.
  const [modelLoaded, setModelLoaded] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [accuracy, setAccuracy] = useState<AccuracyLevel | null>(null)
  const [inView, setInView] = useState(false)
  // Surface-fallback placement: the SDK never auto-places on a surface — the
  // host must flip `triggerPlacement` once a surface is detected (the "reveal"
  // gesture). surfaceReady gates the Place button; triggered fires placement.
  const [surfaceReady, setSurfaceReady] = useState(false)
  const [triggerPlacement, setTriggerPlacement] = useState(false)

  // Collection state.
  const [collecting, setCollecting] = useState(false)
  const [outcome, setOutcome] = useState<CollectOutcome | null>(null)
  const collectingRef = useRef(false)

  // Collect SFX (mirrors the reference app's collect-effect.mp3).
  // keepAudioSessionActive keeps the shared iOS AVAudioSession alive after the
  // SDK's short AR cues finish, so this SFX still has a session to play through.
  const collectSfx = useAudioPlayer(require("@/assets/collect-effect.mp3"), {
    keepAudioSessionActive: true,
  })

  // Configure the audio session so SFX/cues play over the AR camera session and
  // through the iOS silent switch (mirrors the reference app's setArAudioMode).
  // allowsRecording:false forces the Playback category — ARKit/Viro otherwise
  // leaves the session in PlayAndRecord, which routes audio to the quiet
  // earpiece instead of the speaker.
  const applyArAudioMode = useCallback(
    () =>
      setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "mixWithOthers",
        allowsRecording: false,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      }).catch((e) => console.warn("[seekar-demo] setAudioModeAsync failed:", e)),
    []
  )

  useEffect(() => {
    void applyArAudioMode()
  }, [applyArAudioMode])

  // Play the collect SFX. Verbose + resilient: Viro holds the AR audio session,
  // so re-assert the playback route, then retry activation/play because
  // expo-audio can transiently fail with "Session activation failed".
  const playCollectSfx = useCallback(async () => {
    console.log("[seekar-demo] collect SFX: begin", {
      isLoaded: collectSfx.isLoaded,
      duration: collectSfx.duration,
    })
    await applyArAudioMode()
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await setIsAudioActiveAsync(true)
        collectSfx.volume = 1
        collectSfx.loop = false
        await collectSfx.seekTo(0)
        collectSfx.play()
        console.log(`[seekar-demo] collect SFX: play() ok (attempt ${attempt})`, {
          isLoaded: collectSfx.isLoaded,
          isBuffering: collectSfx.isBuffering,
          playing: collectSfx.playing,
          duration: collectSfx.duration,
          volume: collectSfx.volume,
        })
        return
      } catch (sfxErr) {
        console.warn(`[seekar-demo] collect SFX: attempt ${attempt} failed:`, sfxErr)
        await new Promise((r) => setTimeout(r, 250 * attempt))
      }
    }
    console.warn("[seekar-demo] collect SFX: gave up after 3 attempts")
  }, [collectSfx, applyArAudioMode])

  // --- Permissions + data load --------------------------------------------
  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && cameraPermission.canAskAgain) {
      void requestCameraPermission()
    }
  }, [cameraPermission, requestCameraPermission])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          })
          if (!cancelled) {
            setUserLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? undefined,
            })
          }
        }
      } catch {
        // Location is optional for the core flow; ignore failures.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!id) {
      setLoadError("Missing collectible id")
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const c = await getCollectibleById(id, { bypassGeofence: true })
        // For demo items, hydrate full AR config from the API but place the
        // model at the demo coordinates/radius the map spawned it at.
        const merged: Collectible = demoEntry
          ? { ...c, lat: demoEntry.lat, lng: demoEntry.lng, radius: demoEntry.radius, environment: "OUTDOOR" }
          : c
        if (!cancelled) setCollectible(merged)
      } catch (e) {
        // Fall back to the demo entry (it carries the asset basics) so the AR
        // view still works even if the detail fetch fails.
        if (demoEntry) {
          if (!cancelled) setCollectible(demoEntry)
        } else if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load collectible")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, demoEntry])

  // --- Geospatial vs surface ----------------------------------------------
  const useGeospatial = useMemo(() => {
    if (!collectible) return false
    if (collectible.environment === "INDOOR") return false
    return collectible.lat != null && collectible.lng != null
  }, [collectible])

  // --- Collect -------------------------------------------------------------
  const handleCollect = useCallback(async () => {
    if (!collectible || collectingRef.current || outcome?.ok) return
    collectingRef.current = true
    setCollecting(true)
    try {
      // Demo items are tracked client-side: the backend enforces a real-world
      // geofence that the demo's synthetic coordinates won't satisfy, so we
      // record the collection locally to drive the Collected tab.
      if (demoEntry) {
        markCollected(collectible.id)
        haptic(Haptics.NotificationFeedbackType.Success)
        void playCollectSfx()
        setOutcome({ ok: true, title: "Collected!", subtitle: collectible.name })
        return
      }
      const result = await collectPublic({
        collectibleId: collectible.id,
        collectibleInstanceId: collectible.instanceId ?? undefined,
        userLocation: userLocation ?? undefined,
      })
      if (result.success || result.alreadyCollected) {
        haptic(Haptics.NotificationFeedbackType.Success)
        void playCollectSfx()
        setOutcome({
          ok: true,
          title: result.alreadyCollected ? "Already collected" : "Collected!",
          subtitle:
            result.pointsEarned && result.pointsEarned > 0
              ? `+${result.pointsEarned} points`
              : collectible.name,
        })
      } else {
        haptic(Haptics.NotificationFeedbackType.Error)
        setOutcome({ ok: false, title: "Couldn't collect", subtitle: result.message })
        collectingRef.current = false
      }
    } catch (e) {
      haptic(Haptics.NotificationFeedbackType.Error)
      setOutcome({
        ok: false,
        title: "Collect failed",
        subtitle: e instanceof Error ? e.message : undefined,
      })
      collectingRef.current = false
    } finally {
      setCollecting(false)
    }
  }, [collectible, outcome?.ok, userLocation, playCollectSfx, demoEntry])

  // --- SeekARView props ----------------------------------------------------
  const viewerProps: SeekARViewProps | null = useMemo(() => {
    if (!collectible) return null
    const asset = collectible.asset
    return {
      collectibleId: collectible.id,
      instanceId: collectible.instanceId ?? undefined,
      modelUrl: asset?.fileUrl ?? "",
      assetId: asset?.id,
      assetType: toArAssetType(asset?.type),
      fbxUpAxis: asset?.fbxUpAxis ?? null,
      title: collectible.name,
      targetLat: collectible.lat ?? undefined,
      targetLng: collectible.lng ?? undefined,
      elevation: collectible.elevation ?? 0,
      scaleX: collectible.scaleX ?? 1,
      scaleY: collectible.scaleY ?? 1,
      scaleZ: collectible.scaleZ ?? 1,
      modelRotationX: collectible.modelRotationX ?? 0,
      modelRotationY: collectible.modelRotationY ?? 0,
      modelRotationZ: collectible.modelRotationZ ?? 0,
      autoRotate: collectible.rotateInAR ?? false,
      modelAnimationName: collectible.modelAnimationName ?? undefined,
      translationAxis: collectible.translationAxis ?? null,
      translationDistance: collectible.translationDistance,
      translationSpeed: collectible.translationSpeed,
      translationLoopMode: collectible.translationLoopMode,
      translationFlipOnReverse: collectible.translationFlipOnReverse,
      translationDelayMs: collectible.translationDelayMs,
      translationLoopDelayMs: collectible.translationLoopDelayMs,
      audioCues: collectible.audioCues,
      forceSurfaceMode: !useGeospatial,
      onLoadEnd: () => setModelLoaded(true),
      onAnchorCreated: () => setPlaced(true),
      onSurfaceFallbackPositioned: () => setPlaced(true),
      onSurfaceReady: () => setSurfaceReady(true),
      onAccuracyChanged: (a) => setAccuracy(a),
      onCollectibleInViewChange: (v) => setInView(v),
      onCollectibleTapped: () => {
        void handleCollect()
      },
      onError: (msg) => setLoadError(msg),
    }
  }, [collectible, useGeospatial, handleCollect])

  // --- Render --------------------------------------------------------------
  const close = useCallback(() => router.back(), [router])

  if (!cameraPermission) {
    return <CenteredMessage>Requesting camera access…</CenteredMessage>
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.gate}>
        <Text style={styles.gateTitle}>Camera access needed</Text>
        <Text style={styles.gateBody}>
          SeekAR Demo uses the camera to display AR collectibles.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => void requestCameraPermission()}>
          <Text style={styles.primaryBtnText}>Grant camera access</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={close}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    )
  }

  if (loadError && !collectible) {
    return (
      <View style={styles.gate}>
        <Text style={styles.gateTitle}>Could not load collectible</Text>
        <Text style={styles.gateBody}>{loadError}</Text>
        <Pressable style={styles.secondaryBtn} onPress={close}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    )
  }

  if (!viewerProps) {
    return <CenteredMessage>Loading collectible…</CenteredMessage>
  }

  const statusText = !placed
    ? triggerPlacement
      ? "Placing…"
      : surfaceReady
        ? "Surface found — tap Place here"
        : useGeospatial
          ? `Acquiring location${accuracy ? ` · ${accuracy}` : ""}…`
          : "Move your phone to scan a surface"
    : !modelLoaded
      ? "Loading model…"
      : inView
        ? "Tap the collectible to collect"
        : "Look at the collectible"

  return (
    <View style={styles.container}>
      <SeekARView {...viewerProps} triggerPlacement={triggerPlacement} />

      {/* Top bar */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <Pressable style={styles.closeBtn} onPress={close} hitSlop={12}>
          <Text style={styles.closeGlyph}>✕</Text>
        </Pressable>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
        <View style={styles.closeBtn} />
      </View>

      {/* Bottom collect control (hidden once a successful collect overlay shows) */}
      {!outcome?.ok && (
        <View style={[styles.bottomBar, { bottom: insets.bottom + 24 }]}>
          {outcome && !outcome.ok && (
            <Text style={styles.collectError}>{outcome.subtitle ?? outcome.title}</Text>
          )}
          {!placed ? (
            // Surface-fallback reveal: enabled once a surface is detected.
            <Pressable
              disabled={!surfaceReady || triggerPlacement}
              onPress={() => setTriggerPlacement(true)}
              style={[
                styles.collectBtn,
                (!surfaceReady || triggerPlacement) && styles.collectBtnDisabled,
              ]}
            >
              <Text style={styles.collectBtnText}>
                {triggerPlacement ? "Placing…" : "Place here"}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={!inView || collecting}
              onPress={() => void handleCollect()}
              style={[styles.collectBtn, (!inView || collecting) && styles.collectBtnDisabled]}
            >
              {collecting ? (
                <ActivityIndicator color="#0b0b12" />
              ) : (
                <Text style={styles.collectBtnText}>Collect</Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      {outcome?.ok && (
        <CollectSuccessOverlay
          title={outcome.title}
          subtitle={outcome.subtitle}
          onDone={close}
        />
      )}
    </View>
  )
}

function CollectSuccessOverlay({
  title,
  subtitle,
  onDone,
}: {
  title: string
  subtitle?: string
  onDone: () => void
}) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start()
  }, [anim])

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] })

  return (
    <Animated.View style={[styles.overlay, { opacity: anim }]}>
      <Animated.View style={[styles.overlayCard, { transform: [{ scale }] }]}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkGlyph}>✓</Text>
        </View>
        <Text style={styles.overlayTitle}>{title}</Text>
        {subtitle ? <Text style={styles.overlaySubtitle}>{subtitle}</Text> : null}
        <Pressable style={styles.doneBtn} onPress={onDone}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#00FF88" />
      <Text style={styles.dim}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
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
  gateTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  gateBody: { color: "#c9c9d4", fontSize: 15, textAlign: "center" },
  primaryBtn: {
    backgroundColor: "#00FF88",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    marginTop: 8,
  },
  primaryBtnText: { color: "#0b0b12", fontWeight: "700", fontSize: 16 },
  secondaryBtn: { paddingVertical: 12, paddingHorizontal: 24 },
  secondaryBtnText: { color: "#8a8a99", fontSize: 15 },
  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeGlyph: { color: "#fff", fontSize: 18, fontWeight: "600" },
  statusPill: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  statusText: { color: "#fff", fontSize: 13 },
  bottomBar: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  collectBtn: {
    backgroundColor: "#00FF88",
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 999,
    minWidth: 200,
    alignItems: "center",
  },
  collectBtnDisabled: { backgroundColor: "#2a2a38" },
  collectBtnText: { color: "#0b0b12", fontWeight: "800", fontSize: 17 },
  collectError: {
    color: "#ff6b6b",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,5,10,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  overlayCard: {
    alignItems: "center",
    backgroundColor: "#16161f",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 36,
    width: "100%",
    maxWidth: 360,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#00FF88",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  checkGlyph: { color: "#0b0b12", fontSize: 48, fontWeight: "900", lineHeight: 52 },
  overlayTitle: { color: "#ffffff", fontSize: 26, fontWeight: "800" },
  overlaySubtitle: { color: "#00FF88", fontSize: 17, fontWeight: "600", marginTop: 6 },
  doneBtn: {
    marginTop: 28,
    backgroundColor: "#00FF88",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 999,
  },
  doneBtnText: { color: "#0b0b12", fontWeight: "800", fontSize: 16 },
})
