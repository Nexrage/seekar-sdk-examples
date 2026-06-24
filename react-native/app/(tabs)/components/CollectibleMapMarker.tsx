import { memo, useEffect, useState } from "react"
import { Image, StyleSheet, Text, View } from "react-native"
import { Marker } from "react-native-maps"
import type { DemoCollectible } from "@/src/seekar/demoStore"

const SIZE = 46

const RING_COLLECTED = "#3a3a48"
const RING_IN_RANGE = "#00FF88"
const RING_WALK = "#FFB020"

interface Props {
  collectible: DemoCollectible
  inRange: boolean
  collected: boolean
  onPress: (c: DemoCollectible) => void
}

/**
 * A circular thumbnail map marker. The ring color encodes state:
 *   green  = in range now (collect in AR immediately)
 *   amber  = out of range (walk closer)
 *   grey   = already collected
 */
function CollectibleMapMarkerComponent({ collectible, inRange, collected, onPress }: Props) {
  // Custom marker views must keep redrawing until the image is ready, then stop
  // (tracksViewChanges is expensive on iOS if left on).
  const [tracks, setTracks] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 1500)
    return () => clearTimeout(t)
  }, [])

  // Re-render the marker bitmap when its state changes.
  useEffect(() => {
    setTracks(true)
    const t = setTimeout(() => setTracks(false), 600)
    return () => clearTimeout(t)
  }, [inRange, collected])

  if (collectible.lat == null || collectible.lng == null) return null

  const ring = collected ? RING_COLLECTED : inRange ? RING_IN_RANGE : RING_WALK
  const thumb = collectible.thumbnailUrl || collectible.asset?.thumbnailUrl

  return (
    <Marker
      coordinate={{ latitude: collectible.lat, longitude: collectible.lng }}
      onPress={() => onPress(collectible)}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.frame, { borderColor: ring }, collected && styles.frameCollected]}>
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={styles.thumb}
            resizeMode="cover"
            onLoadEnd={() => setTracks(false)}
          />
        ) : (
          <View style={[styles.thumb, styles.placeholder]}>
            <Text style={styles.glyph}>◆</Text>
          </View>
        )}
        {collected && (
          <View style={styles.badge}>
            <Text style={styles.badgeGlyph}>✓</Text>
          </View>
        )}
      </View>
    </Marker>
  )
}

const styles = StyleSheet.create({
  frame: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    backgroundColor: "#16161f",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  frameCollected: { opacity: 0.55 },
  thumb: { width: SIZE - 6, height: SIZE - 6, borderRadius: (SIZE - 6) / 2 },
  placeholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#23232f" },
  glyph: { color: "#00FF88", fontSize: 18 },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#00FF88",
    borderWidth: 2,
    borderColor: "#0b0b12",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeGlyph: { color: "#0b0b12", fontSize: 11, fontWeight: "900" },
})

export const CollectibleMapMarker = memo(CollectibleMapMarkerComponent)
