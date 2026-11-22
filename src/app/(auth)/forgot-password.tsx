import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useAppTheme } from "../../hooks/useAppTheme";
import type { ThemeColors } from "../../context/ThemeContext";

const NETFLIX_BLACK = "#0A0A0A";
const NETFLIX_SURFACE = "#141414";
const NETFLIX_CARD = "#1F1F1F";
const NETFLIX_BORDER = "#2B2B2B";
const NETFLIX_TEXT = "#FFFFFF";
const NETFLIX_MUTED = "#B3B3B3";
const NETFLIX_RED = "#E50914";
const NETFLIX_GREEN = "#46D369";

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Please enter your email address.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return "Please enter a valid email format (e.g. name@mail.com).";
    }
    return "";
  };

  const handleResetPassword = async () => {
    const validationError = validateEmail(email);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setEmailSent(true);
    } catch (error: any) {
      const code = error?.code || "";
      if (code === "auth/invalid-email") {
        setErrorMsg("Invalid email address format.");
      } else if (code === "auth/user-not-found") {
        setErrorMsg("No account found with this email address.");
      } else if (code === "auth/too-many-requests") {
        setErrorMsg("Too many attempts. Please try again later.");
      } else {
        Alert.alert(
          "Error",
          "Could not send reset link. Check your internet connection.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const renderIntroBlock = () => (
    <View style={isLandscape ? styles.landscapeLeftCol : styles.introBlock}>
      <View style={styles.iconWrapper}>
        <Ionicons name="key-outline" size={28} color={NETFLIX_RED} />
      </View>

      <Text
        style={[styles.title, isLandscape && { fontSize: 24, marginBottom: 8 }]}
      >
        Forgot Password?
      </Text>

      <Text
        style={[
          styles.subtitle,
          isLandscape && { fontSize: 13, lineHeight: 19, marginBottom: 0 },
        ]}
      >
        Enter the email address linked to your CineVerse account and we will
        send you a password reset link.
      </Text>
    </View>
  );

  const renderFormCard = () => (
    <View style={[styles.card, isLandscape && { flex: 1.2, padding: 16 }]}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccentBar} />
        <Text style={styles.label}>Email Address</Text>
      </View>

      <View
        style={[
          styles.inputContainer,
          isLandscape && { height: 46 },
          focused && styles.inputContainerFocused,
          errorMsg ? { borderColor: colors.danger || "#F87171" } : null,
        ]}
      >
        <View style={[styles.iconBadge, focused && styles.iconBadgeFocused]}>
          <Ionicons
            name="mail-outline"
            size={17}
            color={focused ? NETFLIX_RED : NETFLIX_MUTED}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="example@email.com"
          placeholderTextColor={NETFLIX_MUTED}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={(text) => {
            setEmail(text);
            if (errorMsg) setErrorMsg("");
          }}
          disableFullscreenUI={true}
        />
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          isLandscape && { height: 46, marginTop: 16 },
          loading && { opacity: 0.7 },
          pressed && { opacity: 0.88 },
        ]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={NETFLIX_TEXT} size="small" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Send Reset Link</Text>
            <Ionicons name="chevron-forward" size={18} color={NETFLIX_TEXT} />
          </>
        )}
      </Pressable>

      <Pressable
        style={styles.backToLoginLink}
        hitSlop={6}
        onPress={() => router.replace("/(auth)/login")}
      >
        <Text style={styles.backToLoginText}>Remembered it? Sign In</Text>
      </Pressable>
    </View>
  );

  const renderSentCard = () => (
    <View
      style={[styles.card, styles.sentCard, isLandscape && { padding: 18 }]}
    >
      <View style={styles.successCircle}>
        <Ionicons name="checkmark-circle" size={36} color={NETFLIX_GREEN} />
      </View>

      <Text style={styles.sentTitle}>Check Your Email</Text>

      <Text style={styles.sentSubtitle}>
        We have sent a password reset link to{" "}
        <Text style={styles.sentEmailHighlight}>{email.trim()}</Text>. Check
        your inbox and spam folder.
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          isLandscape && { height: 46, marginTop: 16 },
          pressed && { opacity: 0.88 },
        ]}
        onPress={() => router.replace("/(auth)/login")}
      >
        <Text style={styles.primaryButtonText}>Back to Sign In</Text>
      </Pressable>

      <Pressable
        style={styles.resendButton}
        hitSlop={6}
        onPress={() => setEmailSent(false)}
      >
        <Text style={styles.resendText}>Try another email address</Text>
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 10, isLandscape ? 14 : 46),
            paddingBottom: Math.max(insets.bottom + 18, 28),
            paddingLeft: Math.max(insets.left + 16, 22),
            paddingRight: Math.max(insets.right + 16, 22),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.topBar, isLandscape && { marginBottom: 12 }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={19} color={NETFLIX_TEXT} />
          </Pressable>

          <View style={styles.brandGroup}>
            <View style={styles.brandSquare}>
              <Text style={styles.brandSquareLetter}>C</Text>
            </View>
            <Text style={styles.brandLogo}>
              CINE<Text style={{ color: NETFLIX_RED }}>VERSE</Text>
            </Text>
          </View>

          <View style={styles.recoveryBadge}>
            <Text style={styles.recoveryBadgeText}>RECOVERY</Text>
          </View>
        </View>

        {emailSent ? (
          <View style={styles.portraitContainer}>{renderSentCard()}</View>
        ) : isLandscape ? (
          <View style={styles.landscapeGrid}>
            {renderIntroBlock()}
            {renderFormCard()}
          </View>
        ) : (
          <View style={styles.portraitContainer}>
            {renderIntroBlock()}
            {renderFormCard()}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: NETFLIX_BLACK,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "space-between",
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: NETFLIX_SURFACE,
      borderWidth: 1,
      borderColor: NETFLIX_BORDER,
      justifyContent: "center",
      alignItems: "center",
    },
    brandGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    brandSquare: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    brandSquareLetter: {
      color: NETFLIX_TEXT,
      fontSize: 17,
      fontWeight: "900",
    },
    brandLogo: {
      color: NETFLIX_TEXT,
      fontSize: 17,
      fontWeight: "900",
      letterSpacing: 2.2,
    },
    recoveryBadge: {
      backgroundColor: `${NETFLIX_RED}1C`,
      borderWidth: 1,
      borderColor: `${NETFLIX_RED}55`,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 6,
    },
    recoveryBadgeText: {
      color: NETFLIX_RED,
      fontSize: 9.5,
      fontWeight: "900",
      letterSpacing: 1.2,
    },
    portraitContainer: {
      width: "100%",
      maxWidth: 460,
      alignSelf: "center",
      flex: 1,
      justifyContent: "center",
      paddingBottom: 24,
    },
    landscapeGrid: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 22,
    },
    landscapeLeftCol: {
      flex: 0.9,
    },
    introBlock: {
      marginBottom: 20,
    },
    iconWrapper: {
      width: 58,
      height: 58,
      borderRadius: 14,
      backgroundColor: `${NETFLIX_RED}1A`,
      borderWidth: 1,
      borderColor: `${NETFLIX_RED}45`,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
      color: NETFLIX_TEXT,
      fontSize: 28,
      fontWeight: "900",
      letterSpacing: -0.3,
      marginBottom: 8,
    },
    subtitle: {
      color: NETFLIX_MUTED,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 22,
    },
    card: {
      backgroundColor: NETFLIX_SURFACE,
      borderWidth: 1,
      borderColor: NETFLIX_BORDER,
      borderRadius: 16,
      padding: 18,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
    },
    sectionAccentBar: {
      width: 3.5,
      height: 15,
      borderRadius: 2,
      backgroundColor: NETFLIX_RED,
    },
    label: {
      color: NETFLIX_TEXT,
      fontSize: 13.5,
      fontWeight: "900",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: NETFLIX_CARD,
      borderWidth: 1.5,
      borderColor: NETFLIX_BORDER,
      borderRadius: 11,
      paddingHorizontal: 10,
      height: 50,
    },
    inputContainerFocused: {
      borderColor: NETFLIX_RED,
      backgroundColor: `${NETFLIX_RED}12`,
    },
    iconBadge: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: NETFLIX_SURFACE,
      justifyContent: "center",
      alignItems: "center",
    },
    iconBadgeFocused: {
      backgroundColor: `${NETFLIX_RED}24`,
    },
    input: {
      flex: 1,
      color: NETFLIX_TEXT,
      fontSize: 14.5,
      fontWeight: "500",
    },
    errorText: {
      color: colors.danger || "#F87171",
      fontSize: 12,
      fontWeight: "700",
      marginTop: 8,
    },
    primaryButton: {
      backgroundColor: NETFLIX_RED,
      height: 50,
      borderRadius: 10,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 20,
    },
    primaryButtonText: {
      color: NETFLIX_TEXT,
      fontSize: 15.5,
      fontWeight: "900",
      letterSpacing: 0.3,
    },
    backToLoginLink: {
      alignItems: "center",
      marginTop: 14,
      paddingVertical: 4,
    },
    backToLoginText: {
      color: NETFLIX_MUTED,
      fontSize: 13,
      fontWeight: "700",
    },
    sentCard: {
      alignItems: "center",
      paddingVertical: 24,
    },
    successCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "rgba(70, 211, 105, 0.14)",
      borderWidth: 1,
      borderColor: "rgba(70, 211, 105, 0.35)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 14,
    },
    sentTitle: {
      color: NETFLIX_TEXT,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 8,
    },
    sentSubtitle: {
      color: NETFLIX_MUTED,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
    },
    sentEmailHighlight: {
      color: NETFLIX_TEXT,
      fontWeight: "800",
    },
    resendButton: {
      alignItems: "center",
      marginTop: 14,
      paddingVertical: 6,
    },
    resendText: {
      color: NETFLIX_RED,
      fontSize: 13.5,
      fontWeight: "800",
    },
  });
