import { useCallback, useMemo } from "react"
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useDemoStore, type DemoCollectible } from "@/src/seekar/demoStore"

interface CollectedEntry {
  collectible: DemoCollectible
  collectedAt: number
}

export default function CollectedScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const store = useDemoStore()

  const collected = useMemo<CollectedEntry[]>(() => {
    return store.collectibles
      .filter((c) => store.collectedAt[c.id] != null)
      .map((c) => ({ collectible: c, collectedAt: store.collectedAt[c.id] }))
      .sort((a, b) => b.collectedAt - a.collectedAt)
  }, [store.collectibles, store.collectedAt])

  const openAr = useCallback(
    (c: DemoCollectible) => {
      router.push({ pathname: "/ar", params: { id: c.id, instanceId: c.instanceId ?? "" } })
    },
    [router]
  )

  if (collected.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="trophy-outline" size={48} color="#3a3a48" />
        <Text style={styles.emptyTitle}>Nothing collected yet</Text>
        <Text style={styles.emptyBody}>
          Head to the Map tab, find a collectible, and view it in AR to collect it. The ones you
          gather will show up here.
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
      data={collected}
      keyExtractor={(entry) => entry.collectible.id}
      ListHeaderComponent={
        <Text style={styles.subtitle}>
          {collected.length} collected — tap to view again in AR
        </Text>
      }
      renderItem={({ item }) => (
        <CollectedRow
          collectible={item.collectible}
          collectedAt={item.collectedAt}
          onPress={openAr}
        />
      )}
    />
  )
}

function CollectedRow({
  collectible,
  collectedAt,
  onPress,
}: {
  collectible: DemoCollectible
  collectedAt: number
  onPress: (c: DemoCollectible) => void
}) {
  const thumbUri = collectible.thumbnailUrl || collectible.asset?.thumbnailUrl
  const when = new Date(collectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(collectible)}
    >
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbGlyph}>◆</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {collectible.name || "Untitled"}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {collectible.asset?.type ?? "—"} · collected {when}
        </Text>
      </View>
      <View style={styles.badge}>
        <Ionicons name="checkmark" size={14} color="#0b0b12" />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#0b0b12" },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  subtitle: { color: "#c9c9d4", fontSize: 14, marginBottom: 12 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b0b12",
    padding: 32,
    gap: 10,
  },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 6 },
  emptyBody: { color: "#8a8a99", fontSize: 15, textAlign: "center", lineHeight: 21 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161f",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  rowPressed: { opacity: 0.6 },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#23232f" },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbGlyph: { color: "#00FF88", fontSize: 22 },
  rowBody: { flex: 1, marginLeft: 12 },
  name: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  meta: { color: "#8a8a99", fontSize: 13, marginTop: 2 },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#00FF88",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
})
