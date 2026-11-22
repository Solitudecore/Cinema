import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "../context/ThemeContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { WatchlistProvider } from "../context/WatchlistContext";

const NETFLIX_RED = "#E50914";
const SPLASH_BG = "#090910";

function RootNavigator() {
  const { colors, theme, isThemeLoading } = useAppTheme();

  if (isThemeLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: SPLASH_BG }]}>
        <StatusBar style="light" />
        <View style={styles.brandBadge}>
          <Text style={styles.brandLetter}>C</Text>
        </View>
        <Text style={styles.brandText}>
          CINE<Text style={{ color: NETFLIX_RED }}>VERSE</Text>
        </Text>
        <ActivityIndicator
          color={NETFLIX_RED}
          size="small"
          style={{ marginTop: 18 }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.rootWrapper, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />

      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          animation: "slide_from_right",
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            contentStyle: { backgroundColor: SPLASH_BG },
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="(drawer)"
          options={{
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="movie/[id]"
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="reviews/[movieId]"
          options={{
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="edit-review/[id]"
          options={{
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.rootWrapper}>
      <ThemeProvider>
        <WatchlistProvider>
          <RootNavigator />
        </WatchlistProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  brandBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: NETFLIX_RED,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  brandLetter: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 3,
  },
});
