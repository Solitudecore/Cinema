import { useEffect, useState } from "react";
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
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../services/firebase";
import { getUserProfile, saveUserProfile } from "../../services/profileStorage";
import { getTrendingMovies, IMAGE_URL } from "../../services/tmdb";

const NETFLIX_RED = "#E50914";
const BG_DARK = "#090910";

const FALLBACK_BACKDROP =
  "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg";

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const [backdropUrl, setBackdropUrl] = useState(FALLBACK_BACKDROP);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadBackdrop = async () => {
      try {
        const response = await getTrendingMovies();
        const movies = response.results ?? [];
        const featured = movies.find((m) => m.backdrop_path || m.poster_path);
        if (isMounted && featured) {
          const path = featured.backdrop_path || featured.poster_path;
          setBackdropUrl(`${IMAGE_URL}w1280${path}`);
        }
      } catch {}
    };

    loadBackdrop();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert("Validation", "Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password,
      );

      const user = userCredential.user;
      const currentProfile = await getUserProfile();

      await saveUserProfile({
        name: user.displayName || cleanEmail.split("@")[0],
        email: user.email || cleanEmail,
        avatarUri:
          currentProfile.email === cleanEmail ? currentProfile.avatarUri : null,
      });

      await AsyncStorage.setItem("is_logged_in", "true");
      router.replace("/(drawer)/(tabs)/home");
    } catch (error: any) {
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        Alert.alert("Login Failed", "Incorrect email or password.");
      } else {
        Alert.alert("Error", error.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderBrandHeader = () => (
    <View style={isLandscape ? styles.landscapeLeftCol : styles.brandBlock}>
      <View style={styles.logoIconBox}>
        <Text style={styles.logoLetter}>C</Text>
      </View>

      <Text style={[styles.logoText, isLandscape && { textAlign: "left" }]}>
        CINE<Text style={{ color: NETFLIX_RED }}>VERSE</Text>
      </Text>

      <Text
        style={[
          styles.title,
          isLandscape && { textAlign: "left", fontSize: 25 },
        ]}
      >
        Sign In
      </Text>

      <Text
        style={[
          styles.subtitle,
          isLandscape && {
            textAlign: "left",
            paddingHorizontal: 0,
            fontSize: 13,
            lineHeight: 19,
          },
        ]}
      >
        Access your My List, ratings, and personal watch history.
      </Text>
    </View>
  );

  const renderFormSection = () => (
    <View
      style={isLandscape ? styles.landscapeRightCol : styles.portraitFormCol}
    >
      <View style={[styles.formCard, isLandscape && { padding: 15 }]}>
        <Text style={[styles.label, { marginTop: 0 }]}>Email Address</Text>
        <View
          style={[
            styles.inputWrapper,
            isLandscape && { height: 46 },
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
            isLandscape && { height: 46 },
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
            placeholder="Enter your password"
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

        <Pressable
          style={styles.forgotBtn}
          hitSlop={6}
          onPress={() => router.push("/(auth)/forgot-password")}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            isLandscape && { height: 46, marginTop: 4 },
            loading && styles.disabledButton,
            pressed && { opacity: 0.88 },
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.buttonText}>Sign In</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </View>

      <View
        style={[
          styles.dividerRow,
          isLandscape && { marginTop: 12, marginBottom: 8 },
        ]}
      >
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>NEW TO CINEVERSE?</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.secondaryButton,
          isLandscape && { height: 42 },
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => router.push("/(auth)/register")}
      >
        <Text style={styles.secondaryButtonText}>Create a Free Account</Text>
      </Pressable>
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
          <View style={[styles.topRow, isLandscape && { marginBottom: 12 }]}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.replace("/(auth)/welcome")}
            >
              <Ionicons name="arrow-back" size={19} color="#FFFFFF" />
            </Pressable>

            <View style={styles.pillBadge}>
              <Text style={styles.pillText}>MEMBER ACCESS</Text>
            </View>
          </View>

          {isLandscape ? (
            <View style={styles.landscapeGrid}>
              {renderBrandHeader()}
              {renderFormSection()}
            </View>
          ) : (
            <View style={styles.portraitContainer}>
              {renderBrandHeader()}
              {renderFormSection()}
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
    marginBottom: 14,
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
  pillBadge: {
    backgroundColor: `${NETFLIX_RED}26`,
    borderWidth: 1,
    borderColor: `${NETFLIX_RED}65`,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pillText: {
    color: NETFLIX_RED,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  portraitContainer: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  portraitFormCol: {
    width: "100%",
  },
  landscapeGrid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },
  landscapeLeftCol: {
    flex: 0.85,
    alignItems: "flex-start",
  },
  landscapeRightCol: {
    flex: 1.2,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  logoIconBox: {
    width: 46,
    height: 46,
    borderRadius: 11,
    backgroundColor: NETFLIX_RED,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  logoLetter: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 3.5,
    marginBottom: 6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: "#D1D5DB",
    fontSize: 13.5,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 10,
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
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 10,
    paddingHorizontal: 11,
    height: 50,
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
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: 10,
    marginBottom: 14,
  },
  forgotText: {
    color: NETFLIX_RED,
    fontSize: 12.5,
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
    marginTop: 2,
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  dividerText: {
    color: "#9CA3AF",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  secondaryButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
