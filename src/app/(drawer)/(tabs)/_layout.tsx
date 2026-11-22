import { useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../../hooks/useAppTheme";

const NETFLIX_RED = "#E50914";

export default function TabsLayout() {
  const { colors, theme } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const activeColor = colors.primary || NETFLIX_RED;
  const barBackground =
    theme === "dark" ? "rgba(13, 13, 21, 0.98)" : colors.surface;

  const bottomInset = Math.max(insets.bottom, isLandscape ? 4 : 8);
  const barHeight = isLandscape ? 44 + bottomInset : 56 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: barBackground,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomInset,
          paddingTop: isLandscape ? 4 : 6,
          elevation: 0,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: isLandscape ? 10 : 11,
          fontWeight: "700",
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={isLandscape ? 18 : size}
              color={focused ? activeColor : colors.muted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={isLandscape ? 18 : size}
              color={focused ? activeColor : colors.muted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="watchlist"
        options={{
          title: "My List",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "bookmark" : "bookmark-outline"}
              size={isLandscape ? 18 : size}
              color={focused ? activeColor : colors.muted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={isLandscape ? 18 : size}
              color={focused ? activeColor : colors.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
