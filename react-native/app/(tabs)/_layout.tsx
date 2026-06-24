import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

const ACCENT = "#00FF88"
const SURFACE = "#0b0b12"

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: SURFACE },
        headerTintColor: "#fff",
        sceneStyle: { backgroundColor: SURFACE },
        tabBarStyle: { backgroundColor: SURFACE, borderTopColor: "#1c1c26" },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: "#6b6b7b",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          tabBarLabel: "Map",
          tabBarIcon: ({ color, size }) => <Ionicons name="map" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: "Collected",
          tabBarLabel: "Collected",
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
