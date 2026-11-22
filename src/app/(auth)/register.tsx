import { useEffect, useMemo, useState } from "react";
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
  ImageBackground,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../../services/firebase";
import { saveUserProfile } from "../../services/profileStorage";
import { getPopularMovies, IMAGE_URL } from "../../services/tmdb";

const NETFLIX_RED = "#E50914";
const NETFLIX_GREEN = "#46D369";
const BG_DARK = "#090910";

const FALLBACK_BACKDROP =
  "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg";

export default function RegisterScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const [backdropUrl, setBackdropUrl] = useState(FALLBACK_BACKDROP);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<
    "name" | "email" | "password" | "confirm" | null
  >(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadBackdrop = async () => {
      try {
        const response = await getPopularMovies();
        const movies = response.results ?? [];
        const featured = movies.find((m) => m.backdrop_path || m.poster_path);
        if (isMounted && featured) {
          const path = featured.backdrop_path || featured.poster_path;
          setBackdropUrl(`${IMAGE_URL}w1280${path}`);
        }
      } catch {
        
      }
    };

    loadBackdrop();

    return () => {
      isMounted = false;
    };
  }, []);

  const passwordStrength = useMemo(() => {
    if (!password) {
      return { level: 0, label: "", color: "rgba(255,255,255,0.2)" };
    }
    if (password.length < 6) {
      return { level: 1, label: "Weak (min 6 chars)", color: "#EF4444" };
    }
    if (password.length < 10) {
      return { level: 2, label: "Medium", color: "#F59E0B" };
    }
    return { level: 3, label: "Strong", color: NETFLIX_GREEN };
  }, [password]);

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const handleRegister = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      Alert.alert("Validation", "Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Validation",
        "Password must be at least 6 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Validation", "Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: cleanName,
      });

      await saveUserProfile({
        name: cleanName,
        email: cleanEmail,
        avatarUri: null,
      });

      await AsyncStorage.setItem("is_logged_in", "true");
      router.replace("/(drawer)/(tabs)/home");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Account Exists", "This email is already registered.");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
      } else {
        Alert.alert("Error", error.message || "Could not create account.");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderHeaderSection = () => (
    <View style={isLandscape ? styles.landscapeLeftCol : styles.header}>
      <View style={styles.brandTagRow}>
        <Text style={styles.brandTagC}>C</Text>
        <Text style={styles.brandTagText}>MEMBERSHIP</Text>
      </View>

      <Text style={[styles.title, isLandscape && { fontSize: 25 }]}>
        Create Account
      </Text>

      <Text
        style={[
          styles.subtitle,
          isLandscape && { fontSize: 13, lineHeight: 19 },
        ]}
      >
        Build your My List, rate films, and track your cinema journey.
      </Text>

      {isLandscape ? (
        <View style={styles.landscapePerks}>
          <Text style={styles.perkItem}>✓ Unlimited Watchlist</Text>
          <Text style={styles.perkItem}>✓ HD Official Trailers</Text>
          <Text style={styles.perkItem}>✓ Personal Critic Scores</Text>
        </View>
      ) : null}
    </View>
  );

  const renderFormCard = () => (
    <View
      style={[
        styles.formCard,
        isLandscape && { flex: 1.25, padding: 15 },
      ]}
    >
      <Text style={[styles.label, { marginTop: 0 }]}>Full Name</Text>
      <View
        style={[
          styles.inputWrapper,
          isLandscape && { height: 44 },
          focusedField === "name" && styles.inputWrapperFocused,
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            focusedField === "name" && styles.iconBadgeFocused,
          ]}
        >
          <Ionicons
            name="person-outline"
            size={17}
            color={focusedField === "name" ? NETFLIX_RED : "#9CA3AF"}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          onFocus={() => setFocusedField("name")}
          onBlur={() => setFocusedField(null)}
          disableFullscreenUI={true}
        />
      </View>

      <Text style={styles.label}>Email Address</Text>
      <View
        style={[
          styles.inputWrapper,
          isLandscape && { height: 44 },
          focusedField === "email" && styles.inputWrapperFocused,
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            focusedField === "email" && styles.iconBadgeFocused,
          ]}
        >
          <Ionicons
            name="mail-outline"
            size={17}
            color={focusedField === "email" ? NETFLIX_RED : "#9CA3AF"}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="name@example.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          onFocus={() => setFocusedField("email")}
          onBlur={() => setFocusedField(null)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          disableFullscreenUI={true}
        />
      </View>

      <Text style={styles.label}>Password</Text>
      <View
        style={[
          styles.inputWrapper,
          isLandscape && { height: 44 },
          focusedField === "password" && styles.inputWrapperFocused,
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            focusedField === "password" && styles.iconBadgeFocused,
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={17}
            color={focusedField === "password" ? NETFLIX_RED : "#9CA3AF"}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Minimum 6 characters"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          onFocus={() => setFocusedField("password")}
          onBlur={() => setFocusedField(null)}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          disableFullscreenUI={true}
        />
        <Pressable
          onPress={() => setShowPassword((prev) => !prev)}
          hitSlop={8}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={19}
            color="#9CA3AF"
          />
        </Pressable>
      </View>

      {password.length > 0 && (
        <View style={styles.strengthContainer}>
          <View style={styles.strengthBars}>
            {[1, 2, 3].map((step) => (
              <View
                key={step}
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor:
                      step <= passwordStrength.level
                        ? passwordStrength.color
                        : "rgba(255, 255, 255, 0.15)",
                  },
                ]}
              />
            ))}
          </View>
          <Text
            style={[
              styles.strengthLabel,
              { color: passwordStrength.color },
            ]}
          >
            {passwordStrength.label}
          </Text>
        </View>
      )}

      <Text style={styles.label}>Confirm Password</Text>
      <View
        style={[
          styles.inputWrapper,
          isLandscape && { height: 44 },
          focusedField === "confirm" && styles.inputWrapperFocused,
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            focusedField === "confirm" && styles.iconBadgeFocused,
          ]}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color={focusedField === "confirm" ? NETFLIX_RED : "#9CA3AF"}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Re-enter your password"
          placeholderTextColor="#9CA3AF"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onFocus={() => setFocusedField("confirm")}
          onBlur={() => setFocusedField(null)}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          disableFullscreenUI={true}
        />
        {passwordsMatch && (
          <Ionicons name="checkmark-circle" size={19} color={NETFLIX_GREEN} />
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          isLandscape && { height: 46, marginTop: 14 },
          loading && styles.disabledButton,
          pressed && { opacity: 0.88 },
        ]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.buttonText}>Create Account</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </>
        )}
      </Pressable>

      <View style={[styles.footer, isLandscape && { marginTop: 12 }]}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Pressable
          hitSlop={8}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.linkText}>Sign In</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ImageBackground
      source={{ uri: backdropUrl }}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 10, isLandscape ? 14 : 46),
              paddingBottom: Math.max(insets.bottom + 16, 26),
              paddingLeft: Math.max(insets.left + 16, 22),
              paddingRight: Math.max(insets.right + 16, 22),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          automaticallyAdjustKeyboardInsets
        >
          
          <View
            style={[
              styles.topRow,
              isLandscape && { marginBottom: 12 },
            ]}
          >
            <Pressable
              style={styles.backButton}
              onPress={() => router.replace("/(auth)/welcome")}
            >
              <Ionicons name="arrow-back" size={19} color="#FFFFFF" />
            </Pressable>

            <View style={styles.brandGroup}>
              <View style={styles.brandSquare}>
                <Text style={styles.brandSquareLetter}>C</Text>
              </View>
              <Text style={styles.brandLogo}>
                CINE<Text style={{ color: NETFLIX_RED }}>VERSE</Text>
              </Text>
            </View>

            <View style={styles.pillBadge}>
              <Text style={styles.pillText}>JOIN</Text>
            </View>
          </View>

          {isLandscape ? (
            <View style={styles.landscapeGrid}>
              {renderHeaderSection()}
              {renderFormCard()}
            </View>
          ) : (
            <View style={styles.portraitContainer}>
              {renderHeaderSection()}
              {renderFormCard()}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(9, 9, 16, 0.85)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.09)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
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
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  brandLogo: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  pillBadge: {
    backgroundColor: `${NETFLIX_RED}26`,
    borderWidth: 1,
    borderColor: `${NETFLIX_RED}65`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pillText: {
    color: NETFLIX_RED,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  portraitContainer: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  landscapeGrid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },
  landscapeLeftCol: {
    flex: 0.85,
  },
  header: {
    marginBottom: 22,
    marginTop: 6,
  },
  brandTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  brandTagC: {
    color: NETFLIX_RED,
    fontSize: 13,
    fontWeight: "900",
  },
  brandTagText: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: "#D1D5DB",
    fontSize: 13.5,
    marginTop: 6,
    lineHeight: 20,
  },
  landscapePerks: {
    marginTop: 14,
    gap: 6,
  },
  perkItem: {
    color: NETFLIX_GREEN,
    fontSize: 12,
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "rgba(19, 19, 30, 0.92)",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  label: {
    color: "#E5E7EB",
    fontSize: 12.5,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 11,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 10,
    paddingHorizontal: 11,
    height: 48,
    gap: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  inputWrapperFocused: {
    borderColor: NETFLIX_RED,
    backgroundColor: "rgba(229, 9, 20, 0.1)",
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBadgeFocused: {
    backgroundColor: "rgba(229, 9, 20, 0.22)",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 10,
  },
  strengthBars: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 4,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: "800",
  },
  button: {
    backgroundColor: NETFLIX_RED,
    height: 52,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  footerText: {
    color: "#9CA3AF",
    fontSize: 13.5,
  },
  linkText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});