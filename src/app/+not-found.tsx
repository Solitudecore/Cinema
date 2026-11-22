import { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import type { ThemeColors } from "../context/ThemeContext";

const NETFLIX_RED = "#E50914";

export default function NotFoundScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const canGoBack = router.canGoBack();

  const handleGoHome = () => {
    router.replace("/");
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const renderVisualBlock = () => (
    <View
      style={[
        styles.visualBlock,
        isLandscape && styles.visualBlockLandscape,
      ]}
    >
      <View style={styles.codeBadge}>
        <Text style={styles.codeBadgeText}>ERROR 404</Text>
      </View>

      <View style={styles.iconBox}>
        <Ionicons name="film-outline" size={38} color={NETFLIX_RED} />
      </View>

      <Text style={styles.code}>404</Text>
      <Text style={styles.subCodeLabel}>SIGNAL INTERRUPTED</Text>
    </View>
  );

  const renderMessageBlock = () => (
    <View
      style={[
        styles.messageBlock,
        isLandscape && styles.messageBlockLandscape,
      ]}
    >
      <View style={styles.titleRow}>
        <View style={styles.titleAccent} />
        <Text
          style={[
            styles.title,
            isLandscape && { fontSize: 22, textAlign: "left" },
          ]}
        >
          Lost Your Way?
        </Text>
      </View>

      <Text
        style={[
          styles.subtitle,
          isLandscape && { textAlign: "left", marginBottom: 18 },
        ]}
      >
        The screen you are looking for does not exist or has been moved. You
        can return to the CineVerse home feed and keep exploring.
      </Text>

      <View
        style={[
          styles.actionsRow,
          isLandscape && { alignItems: "flex-start" },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.button,
            isLandscape && { height: 46, paddingHorizontal: 20 },
            pressed && { opacity: 0.88 },
          ]}
          onPress={handleGoHome}
        >
          <Ionicons name="home" size={17} color="#FFFFFF" />
          <Text style={styles.buttonText}>Back to CineVerse</Text>
        </Pressable>

        {canGoBack ? (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              isLandscape && { height: 42, paddingHorizontal: 16 },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={15} color={colors.text} />
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top + 12, isLandscape ? 16 : 48),
          paddingBottom: Math.max(insets.bottom + 20, 32),
          paddingLeft: Math.max(insets.left + 16, 22),
          paddingRight: Math.max(insets.right + 16, 22),
        },
      ]}
      showsVerticalScrollIndicator={false}
    > 
      <View style={styles.topBar}>
        <View style={styles.brandGroup}>
          <View style={styles.brandSquare}>
            <Text style={styles.brandSquareLetter}>C</Text>
          </View>
          <Text style={styles.brandLogo}>
            CINE<Text style={{ color: NETFLIX_RED }}>VERSE</Text>
          </Text>
        </View>
      </View>


      <View
        style={[
          styles.mainCard,
          isLandscape && styles.mainCardLandscape,
        ]}
      >
        {renderVisualBlock()}
        {renderMessageBlock()}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
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
      gap: 9,
    },
    brandSquare: {
      width: 30,
      height: 30,
      borderRadius: 6,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    brandSquareLetter: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "900",
    },
    brandLogo: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      letterSpacing: 2.2,
    },
    mainCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 22,
      marginVertical: 20,
      alignItems: "center",
    },
    mainCardLandscape: {
      flexDirection: "row",
      alignItems: "center",
      gap: 24,
      padding: 18,
      marginVertical: 12,
    },
    visualBlock: {
      alignItems: "center",
      marginBottom: 16,
    },
    visualBlockLandscape: {
      marginBottom: 0,
      paddingRight: 20,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      minWidth: 150,
    },
    codeBadge: {
      backgroundColor: `${NETFLIX_RED}20`,
      borderWidth: 1,
      borderColor: `${NETFLIX_RED}55`,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 14,
    },
    codeBadgeText: {
      color: NETFLIX_RED,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    iconBox: {
      width: 76,
      height: 76,
      borderRadius: 20,
      backgroundColor: `${NETFLIX_RED}16`,
      borderWidth: 1,
      borderColor: `${NETFLIX_RED}40`,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
    },
    code: {
      color: NETFLIX_RED,
      fontSize: 38,
      fontWeight: "900",
      letterSpacing: 2,
      lineHeight: 42,
    },
    subCodeLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.5,
      marginTop: 4,
    },
    messageBlock: {
      width: "100%",
      alignItems: "center",
    },
    messageBlockLandscape: {
      flex: 1,
      alignItems: "flex-start",
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    titleAccent: {
      width: 3.5,
      height: 18,
      borderRadius: 2,
      backgroundColor: NETFLIX_RED,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "900",
      letterSpacing: -0.3,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 21,
      marginBottom: 24,
      maxWidth: 360,
    },
    actionsRow: {
      width: "100%",
      alignItems: "center",
      gap: 10,
    },
    button: {
      width: "100%",
      maxWidth: 300,
      height: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: NETFLIX_RED,
      paddingHorizontal: 22,
      borderRadius: 10,
    },
    buttonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    secondaryButton: {
      height: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 18,
      borderRadius: 10,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 13.5,
      fontWeight: "700",
    },
  });