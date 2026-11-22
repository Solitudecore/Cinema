import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NETFLIX_RED = "#E50914";
const NETFLIX_GREEN = "#46D369";
const BG_DARK = "#090910";
const SURFACE_DARK = "#13131E";
const CARD_DARK = "#1B1B29";
const BORDER_DARK = "rgba(255, 255, 255, 0.1)";

interface SlideItem {
  number: string;
  tag: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  pills: string[];
}

const SLIDES: SlideItem[] = [
  {
    number: "01",
    tag: "UNLIMITED DISCOVERY",
    title: "Discover Movies\nWorth Watching",
    description:
      "Explore trending blockbusters, Top 10 daily picks, and hidden gems tailored to your mood.",
    icon: "film",
    pills: ["Top 10 Today", "HD Trailers", "Smart Filters"],
  },
  {
    number: "02",
    tag: "PERSONAL LIBRARY",
    title: "Curate Your\nOwn My List",
    description:
      "Save films to watch later, organize by genre, and never lose track of a recommendation.",
    icon: "bookmark",
    pills: ["My List", "Offline Cache", "Quick Save"],
  },
  {
    number: "03",
    tag: "CINEMA INSIGHTS",
    title: "Rate, Review &\nTrack History",
    description:
      "Score every movie you finish, write personal reviews, and see your top genres over time.",
    icon: "star",
    pills: ["1–5 Ratings", "Critic Notes", "Watch Stats"],
  },
];

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const [currentIndex, setCurrentIndex] = useState(0);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOpacity, logoScale]);

  useEffect(() => {
    slideAnimation.setValue(0);

    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [currentIndex, slideAnimation]);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem("onboarding_completed", "true");
    router.replace("/(auth)/welcome");
  };

  const nextSlide = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishOnboarding();
    }
  };

  const slideOpacity = slideAnimation;
  const slideTranslateX = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 0],
  });

  const activeSlide = SLIDES[currentIndex];
  const isLastSlide = currentIndex === SLIDES.length - 1;

  const renderShowcaseCard = () => (
    <View
      style={[styles.showcaseCard, isLandscape && styles.showcaseCardLandscape]}
    >
      <View style={styles.showcaseTopRow}>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>STEP {activeSlide.number}</Text>
        </View>
        <Text style={styles.matchScoreText}>99% Match</Text>
      </View>

      <View style={styles.emblemWrapper}>
        <View style={styles.emblemOuterRing}>
          <View style={styles.emblemInnerCircle}>
            <Ionicons
              name={activeSlide.icon}
              size={isLandscape ? 30 : 38}
              color="#FFFFFF"
            />
          </View>
        </View>
      </View>

      <View style={styles.featurePillsRow}>
        {activeSlide.pills.map((pill) => (
          <View key={pill} style={styles.featurePill}>
            <Text style={styles.featurePillText}>{pill}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderTextAndActions = () => (
    <View style={isLandscape ? styles.landscapeRightCol : undefined}>
      <View style={styles.tagRow}>
        <View style={styles.tagAccent} />
        <Text style={styles.tagText}>{activeSlide.tag}</Text>
      </View>

      <Text
        style={[
          styles.title,
          isLandscape && { fontSize: 24, lineHeight: 30, marginBottom: 8 },
        ]}
      >
        {activeSlide.title}
      </Text>

      <Text
        style={[
          styles.description,
          isLandscape && { fontSize: 13, lineHeight: 19 },
        ]}
      >
        {activeSlide.description}
      </Text>

      <View
        style={[
          styles.indicators,
          isLandscape && { marginTop: 16, marginBottom: 16 },
        ]}
      >
        {SLIDES.map((_, index) => {
          const active = currentIndex === index;
          return (
            <Pressable
              key={index}
              hitSlop={8}
              onPress={() => setCurrentIndex(index)}
              style={[styles.indicator, active && styles.activeIndicator]}
            />
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          isLandscape && { height: 48 },
          pressed && { opacity: 0.88 },
        ]}
        onPress={nextSlide}
      >
        <Text style={styles.buttonText}>
          {isLastSlide ? "Get Started" : "Continue"}
        </Text>
        <Ionicons
          name={isLastSlide ? "play" : "arrow-forward"}
          size={18}
          color="#FFFFFF"
        />
      </Pressable>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top + 10, isLandscape ? 16 : 46),
          paddingBottom: Math.max(insets.bottom + 18, isLandscape ? 20 : 38),
          paddingLeft: Math.max(insets.left + 16, 24),
          paddingRight: Math.max(insets.right + 16, 24),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          styles.topHeader,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.brandGroup}>
          <View style={styles.brandSquare}>
            <Text style={styles.brandSquareLetter}>C</Text>
          </View>
          <Text style={styles.logo}>
            CINE<Text style={{ color: NETFLIX_RED }}>VERSE</Text>
          </Text>
        </View>

        <Pressable
          style={styles.skipBtn}
          hitSlop={8}
          onPress={finishOnboarding}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          styles.mainBody,
          isLandscape && styles.mainBodyLandscape,
          {
            opacity: slideOpacity,
            transform: [{ translateX: slideTranslateX }],
          },
        ]}
      >
        {renderShowcaseCard()}
        {renderTextAndActions()}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  topHeader: {
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
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: SURFACE_DARK,
    borderWidth: 1,
    borderColor: BORDER_DARK,
  },
  skipText: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  mainBody: {
    marginTop: 20,
    gap: 24,
  },
  mainBodyLandscape: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginTop: 12,
  },
  landscapeRightCol: {
    flex: 1,
  },
  showcaseCard: {
    backgroundColor: SURFACE_DARK,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER_DARK,
    justifyContent: "space-between",
    minHeight: 230,
  },
  showcaseCardLandscape: {
    width: "44%",
    minHeight: 200,
    padding: 14,
  },
  showcaseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepPill: {
    backgroundColor: `${NETFLIX_RED}24`,
    borderWidth: 1,
    borderColor: `${NETFLIX_RED}55`,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepPillText: {
    color: NETFLIX_RED,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  matchScoreText: {
    color: NETFLIX_GREEN,
    fontSize: 12,
    fontWeight: "800",
  },
  emblemWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14,
  },
  emblemOuterRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${NETFLIX_RED}18`,
    borderWidth: 1,
    borderColor: `${NETFLIX_RED}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  emblemInnerCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: NETFLIX_RED,
    alignItems: "center",
    justifyContent: "center",
  },
  featurePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 7,
  },
  featurePill: {
    backgroundColor: CARD_DARK,
    borderWidth: 1,
    borderColor: BORDER_DARK,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  featurePillText: {
    color: "#E5E7EB",
    fontSize: 11,
    fontWeight: "700",
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tagAccent: {
    width: 3.5,
    height: 14,
    borderRadius: 2,
    backgroundColor: NETFLIX_RED,
  },
  tagText: {
    color: NETFLIX_RED,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  description: {
    color: "#9CA3AF",
    fontSize: 15,
    lineHeight: 23,
  },
  indicators: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 26,
    marginBottom: 22,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  activeIndicator: {
    width: 28,
    backgroundColor: NETFLIX_RED,
  },
  button: {
    backgroundColor: NETFLIX_RED,
    height: 52,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
