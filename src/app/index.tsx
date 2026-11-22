import { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppTheme } from "../hooks/useAppTheme";

const NETFLIX_RED = "#E50914";

export default function Index() {
  const { colors } = useAppTheme();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;

  useEffect(() => {
    let isMounted = true;

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    const checkInitialRoute = async () => {
      try {
        const [onboardingCompleted, isLoggedIn] = await Promise.all([
          AsyncStorage.getItem("onboarding_completed"),
          AsyncStorage.getItem("is_logged_in"),
          new Promise((resolve) => setTimeout(resolve, 450)),
        ]);

        if (!isMounted) return;

        if (onboardingCompleted !== "true") {
          router.replace("/onboarding");
          return;
        }

        if (isLoggedIn === "true") {
          router.replace("/(drawer)/(tabs)/home");
        } else {
          router.replace("/(auth)/welcome");
        }
      } catch {
        if (isMounted) {
          router.replace("/(auth)/welcome");
        }
      }
    };

    checkInitialRoute();

    return () => {
      isMounted = false;
    };
  }, [logoOpacity, logoScale]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.brandContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.brandBadge}>
          <Text style={styles.brandLetter}>C</Text>
        </View>

        <Text style={[styles.brandText, { color: colors.text }]}>
          CINE<Text style={{ color: NETFLIX_RED }}>VERSE</Text>
        </Text>

        <Text style={[styles.tagline, { color: colors.muted }]}>
          YOUR MOVIE UNIVERSE
        </Text>
      </Animated.View>

      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={NETFLIX_RED} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  brandContainer: {
    alignItems: "center",
  },
  brandBadge: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: NETFLIX_RED,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  brandLetter: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  brandText: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 3.5,
  },
  tagline: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 4,
    marginTop: 8,
  },
  footerLoader: {
    position: "absolute",
    bottom: 52,
  },
});
