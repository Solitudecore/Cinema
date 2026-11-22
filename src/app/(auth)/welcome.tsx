import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTrendingMovies, IMAGE_URL } from "../../services/tmdb";

const NETFLIX_RED = "#E50914";
const NETFLIX_GREEN = "#46D369";
const BG_DARK = "#090910";

const FALLBACK_BACKDROP =
  "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg";

export default function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const [backdropUrl, setBackdropUrl] = useState(FALLBACK_BACKDROP);
  const [featuredTitle, setFeaturedTitle] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadHeroBackdrop = async () => {
      try {
        const response = await getTrendingMovies();
        const movies = response.results ?? [];
        const firstWithImage = movies.find(
          (m) => m.backdrop_path || m.poster_path,
        );

        if (isMounted && firstWithImage) {
          const path =
            firstWithImage.backdrop_path || firstWithImage.poster_path;
          setBackdropUrl(`${IMAGE_URL}w1280${path}`);
          if (firstWithImage.title) {
            setFeaturedTitle(firstWithImage.title);
          }
        }
      } catch {}
    };

    loadHeroBackdrop();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ImageBackground
        source={{ uri: backdropUrl }}
        style={styles.background}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            "rgba(9, 9, 16, 0.65)",
            "rgba(9, 9, 16, 0.82)",
            "rgba(9, 9, 16, 0.94)",
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradientOverlay}
        />

        <View
          style={[
            styles.overlayContent,
            {
              paddingTop: Math.max(insets.top + 10, isLandscape ? 16 : 48),
              paddingBottom: Math.max(
                insets.bottom + 18,
                isLandscape ? 20 : 40,
              ),
              paddingLeft: Math.max(insets.left + 16, 24),
              paddingRight: Math.max(insets.right + 16, 24),
            },
          ]}
        >
          <View style={styles.topBar}>
            <View style={styles.brandGroup}>
              <View style={styles.brandSquare}>
                <Text style={styles.brandSquareLetter}>C</Text>
              </View>
              <Text style={styles.logo}>
                CINE<Text style={{ color: NETFLIX_RED }}>VERSE</Text>
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.signInTopButton,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.signInTopText}>Sign In</Text>
            </Pressable>
          </View>

          {featuredTitle && !isLandscape ? (
            <View style={styles.trendingPill}>
              <View style={styles.trendingDot} />
              <Text style={styles.trendingPillText} numberOfLines={1}>
                TRENDING NOW · {featuredTitle.toUpperCase()}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.bottomContent,
              isLandscape && styles.bottomContentLandscape,
            ]}
          >
            <View
              style={
                isLandscape ? styles.landscapeLeftCol : styles.portraitHeaderCol
              }
            >
              <View style={styles.badge}>
                <Text style={styles.badgeC}>C</Text>
                <Text style={styles.badgeText}>ORIGINAL CINEMA HUB</Text>
              </View>

              <Text
                style={[
                  styles.title,
                  isLandscape && {
                    fontSize: 27,
                    lineHeight: 33,
                    textAlign: "left",
                  },
                ]}
              >
                Unlimited movies, reviews, and more.
              </Text>

              <View
                style={[
                  styles.highlightsRow,
                  isLandscape && { justifyContent: "flex-start" },
                ]}
              >
                <Text style={styles.matchText}>HD Trailers</Text>
                <Text style={styles.dotSep}>•</Text>
                <Text style={styles.highlightItem}>My List</Text>
                <Text style={styles.dotSep}>•</Text>
                <Text style={styles.highlightItem}>Critic Scores</Text>
              </View>
            </View>

            <View
              style={
                isLandscape
                  ? styles.landscapeRightCol
                  : styles.portraitActionsCol
              }
            >
              <Text
                style={[
                  styles.subtitle,
                  isLandscape && {
                    textAlign: "left",
                    marginTop: 0,
                    marginBottom: 16,
                    fontSize: 13.5,
                    lineHeight: 20,
                  },
                ]}
              >
                Discover trending films, build your personal watchlist, and rate
                every movie you watch.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.getStartedButton,
                  isLandscape && { height: 48 },
                  pressed && { opacity: 0.88 },
                ]}
                onPress={() => router.push("/(auth)/register")}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </Pressable>

              <View
                style={[
                  styles.loginRow,
                  isLandscape && {
                    marginTop: 12,
                    justifyContent: "flex-start",
                  },
                ]}
              >
                <Text style={styles.loginPrompt}>
                  Already have an account?{" "}
                </Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => router.push("/(auth)/login")}
                >
                  <Text style={styles.loginLink}>Sign In</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  background: {
    flex: 1,
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  overlayContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandSquare: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: NETFLIX_RED,
    justifyContent: "center",
    alignItems: "center",
  },
  brandSquareLetter: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  logo: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2.4,
  },
  signInTopButton: {
    backgroundColor: NETFLIX_RED,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  signInTopText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  trendingPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(19, 19, 30, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    maxWidth: "88%",
  },
  trendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NETFLIX_RED,
  },
  trendingPillText: {
    color: "#E5E7EB",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  bottomContent: {
    alignItems: "center",
  },
  bottomContentLandscape: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 24,
  },
  portraitHeaderCol: {
    alignItems: "center",
  },
  portraitActionsCol: {
    width: "100%",
    alignItems: "center",
  },
  landscapeLeftCol: {
    flex: 1.15,
    alignItems: "flex-start",
  },
  landscapeRightCol: {
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(229, 9, 20, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(229, 9, 20, 0.55)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 14,
  },
  badgeC: {
    color: NETFLIX_RED,
    fontSize: 12,
    fontWeight: "900",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 33,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  highlightsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  matchText: {
    color: NETFLIX_GREEN,
    fontSize: 12.5,
    fontWeight: "800",
  },
  highlightItem: {
    color: "#E5E7EB",
    fontSize: 12.5,
    fontWeight: "700",
  },
  dotSep: {
    color: NETFLIX_RED,
    fontSize: 12,
    fontWeight: "900",
  },
  subtitle: {
    color: "#D1D5DB",
    fontSize: 14.5,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  getStartedButton: {
    width: "100%",
    height: 54,
    backgroundColor: NETFLIX_RED,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  getStartedText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  loginPrompt: {
    color: "#9CA3AF",
    fontSize: 13.5,
  },
  loginLink: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
