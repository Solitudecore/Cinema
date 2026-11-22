import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth } from "../../services/firebase";
import { useAppTheme } from "../../hooks/useAppTheme";
import { clearRecentHistory } from "../../services/historyStorage";
import { clearTmdbCache } from "../../services/tmdb";
import {
  NOTIF_STORAGE_KEY,
  requestNotificationPermission,
  sendCineVerseNotification,
} from "../../services/notifications";
import type { ThemeColors } from "../../context/ThemeContext";

const NETFLIX_RED = "#E50914";
const NETFLIX_GREEN = "#46D369";

export default function SettingsScreen() {
  const { colors, theme, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(NOTIF_STORAGE_KEY);
        if (saved === "true") {
          setNotificationsEnabled(true);
        }
      } catch {}
    })();
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    if (!value) {
      setNotificationsEnabled(false);
      await AsyncStorage.setItem(NOTIF_STORAGE_KEY, "false");
      return;
    }

    const granted = await requestNotificationPermission();
    if (!granted) {
      setNotificationsEnabled(false);
      await AsyncStorage.setItem(NOTIF_STORAGE_KEY, "false");
      return;
    }

    setNotificationsEnabled(true);
    await AsyncStorage.setItem(NOTIF_STORAGE_KEY, "true");

    await sendCineVerseNotification(
      "CineVerse Notifications Active 🎬",
      "You will now receive alerts for trending movies and watchlist reminders.",
      true,
    );
  };

  const resetPasswordModal = () => {
    setPasswordModalVisible(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswords(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Validation", "Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Validation",
        "New password must be at least 6 characters long.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Validation", "New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(
        "Validation",
        "New password must be different from your current password.",
      );
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      Alert.alert("Error", "No authenticated email account found.");
      return;
    }

    try {
      setUpdatingPassword(true);
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      resetPasswordModal();
      Alert.alert("Success", "Your password has been updated successfully.");
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        Alert.alert("Incorrect Password", "Your current password is wrong.");
      } else if (code === "auth/weak-password") {
        Alert.alert("Weak Password", "Please choose a stronger password.");
      } else {
        Alert.alert("Error", "Could not update password. Please try again.");
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache & History",
      "Remove cached TMDB movies, recently viewed movies and recent searches?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const removedCount = await clearTmdbCache();
              await clearRecentHistory();

              Alert.alert(
                "Cleared Successfully",
                `Offline cache and search history cleared.\n${removedCount} cached TMDB entries removed.`,
              );
            } catch {
              Alert.alert(
                "Error",
                "Could not completely clear cache and history.",
              );
            }
          },
        },
      ],
    );
  };

  const userEmail = auth.currentUser?.email;

  const renderAppearanceSection = () => (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccentBar} />
        <Text style={styles.sectionTitle}>Appearance</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={styles.iconBox}>
              <Ionicons
                name={theme === "dark" ? "moon" : "sunny"}
                size={18}
                color={NETFLIX_RED}
              />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Cinema Dark Mode</Text>
              <Text style={styles.rowSub}>
                {theme === "dark"
                  ? "Theater-grade dark interface active"
                  : "Daylight theme active"}
              </Text>
            </View>
          </View>

          <Switch
            value={theme === "dark"}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: NETFLIX_RED }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    </View>
  );

  const renderNotificationsSection = () => (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccentBar} />
        <Text style={styles.sectionTitle}>Notifications</Text>
        {notificationsEnabled && (
          <View style={styles.activeStatusPill}>
            <Text style={styles.activeStatusText}>ON</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={styles.iconBox}>
              <Ionicons
                name="notifications-outline"
                size={18}
                color={NETFLIX_RED}
              />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>New Releases & Alerts</Text>
              <Text style={styles.rowSub}>
                Trending drops & My List watch reminders
              </Text>
            </View>
          </View>

          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: colors.border, true: NETFLIX_RED }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    </View>
  );

  const renderSecuritySection = () => (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccentBar} />
        <Text style={styles.sectionTitle}>Account & Security</Text>
      </View>

      <View style={styles.card}>
        {userEmail ? (
          <>
            <View style={styles.accountInfoRow}>
              <View style={styles.brandMiniSquare}>
                <Text style={styles.brandMiniLetter}>C</Text>
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.accountEmailText} numberOfLines={1}>
                  {userEmail}
                </Text>
                <Text style={styles.accountPlanText}>
                  CineVerse Member · Ultra HD
                </Text>
              </View>
            </View>
            <View style={styles.rowDivider} />
          </>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
          onPress={() => setPasswordModalVisible(true)}
        >
          <View style={styles.rowLeft}>
            <View style={styles.iconBox}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={NETFLIX_RED}
              />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Change Password</Text>
              <Text style={styles.rowSub}>
                Update your account sign-in password
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );

  const renderStorageSection = () => (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccentBar} />
        <Text style={styles.sectionTitle}>Storage & Offline Data</Text>
      </View>

      <View style={styles.card}>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
          onPress={handleClearCache}
        >
          <View style={styles.rowLeft}>
            <View style={styles.iconBox}>
              <Ionicons name="trash-outline" size={18} color={NETFLIX_RED} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: NETFLIX_RED }]}>
                Clear Offline Cache & History
              </Text>
              <Text style={styles.rowSub}>
                Free up space by removing cached movies & searches
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color={NETFLIX_RED} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingLeft: Math.max(insets.left + 12, isLandscape ? 20 : 14),
          paddingRight: Math.max(insets.right + 12, isLandscape ? 20 : 14),
          paddingTop: isLandscape ? 10 : 14,
          paddingBottom: Math.max(insets.bottom + 20, 36),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[styles.pageHeader, isLandscape && styles.pageHeaderLandscape]}
      >
        <View>
          <View style={styles.prefBadge}>
            <Text style={styles.prefBadgeText}>PREFERENCES</Text>
          </View>
          <Text style={[styles.pageTitle, isLandscape && { fontSize: 21 }]}>
            App Settings
          </Text>
        </View>

        <View style={styles.versionPill}>
          <Text style={styles.versionText}>CINEVERSE 1.0</Text>
        </View>
      </View>

      {isLandscape ? (
        <View style={styles.landscapeColumns}>
          <View style={styles.landscapeCol}>
            {renderAppearanceSection()}
            {renderNotificationsSection()}
          </View>

          <View style={styles.landscapeCol}>
            {renderSecuritySection()}
            {renderStorageSection()}
          </View>
        </View>
      ) : (
        <>
          {renderAppearanceSection()}
          {renderNotificationsSection()}
          {renderSecuritySection()}
          {renderStorageSection()}
        </>
      )}

      <Modal
        visible={passwordModalVisible}
        transparent
        statusBarTranslucent
        animationType="fade"
        supportedOrientations={["portrait", "landscape"]}
        onRequestClose={resetPasswordModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={updatingPassword ? undefined : resetPasswordModal}
          />

          <View
            style={[
              styles.modalCard,
              isLandscape && { maxHeight: "90%", padding: 16 },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.modalTitle}>Change Password</Text>
              </View>

              <Pressable
                style={styles.modalCloseBtn}
                onPress={resetPasswordModal}
                disabled={updatingPassword}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={[styles.modalInput, isLandscape && { height: 42 }]}
                placeholder="Enter current password"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPasswords}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />

              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={[styles.modalInput, isLandscape && { height: 42 }]}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPasswords}
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={[styles.modalInput, isLandscape && { height: 42 }]}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPasswords}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <Pressable
                style={styles.showPassRow}
                onPress={() => setShowPasswords((prev) => !prev)}
              >
                <Ionicons
                  name={showPasswords ? "checkbox" : "square-outline"}
                  size={18}
                  color={NETFLIX_RED}
                />
                <Text style={styles.showPassText}>Show passwords</Text>
              </Pressable>

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalCancelBtn, isLandscape && { height: 42 }]}
                  onPress={resetPasswordModal}
                  disabled={updatingPassword}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalSaveBtn,
                    isLandscape && { height: 42 },
                    updatingPassword && { opacity: 0.6 },
                  ]}
                  onPress={handleChangePassword}
                  disabled={updatingPassword}
                >
                  {updatingPassword ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalSaveText}>Update Password</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flexGrow: 1,
    },
    pageHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    pageHeaderLandscape: {
      alignItems: "center",
      marginBottom: 12,
    },
    prefBadge: {
      alignSelf: "flex-start",
      backgroundColor: NETFLIX_RED,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 4,
    },
    prefBadgeText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.2,
    },
    pageTitle: {
      color: colors.text,
      fontSize: 25,
      fontWeight: "900",
      letterSpacing: -0.3,
    },
    versionPill: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    versionText: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1,
    },
    landscapeColumns: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 16,
    },
    landscapeCol: {
      flex: 1,
    },
    sectionBlock: {
      marginBottom: 18,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 9,
    },
    sectionAccentBar: {
      width: 3.5,
      height: 15,
      borderRadius: 2,
      backgroundColor: NETFLIX_RED,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    activeStatusPill: {
      backgroundColor: `${NETFLIX_GREEN}20`,
      borderWidth: 1,
      borderColor: `${NETFLIX_GREEN}60`,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 5,
    },
    activeStatusText: {
      color: NETFLIX_GREEN,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.6,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    accountInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.card,
    },
    brandMiniSquare: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    brandMiniLetter: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "900",
    },
    accountEmailText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
    },
    accountPlanText: {
      color: NETFLIX_GREEN,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 1,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
      gap: 12,
    },
    rowLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowTextWrap: {
      flex: 1,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: `${NETFLIX_RED}18`,
      justifyContent: "center",
      alignItems: "center",
    },
    rowTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
    },
    rowSub: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.76)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalCard: {
      width: "100%",
      maxWidth: 440,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    modalTitleGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
    },
    modalCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    inputLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 6,
      marginTop: 8,
    },
    modalInput: {
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 14,
      height: 46,
      color: colors.text,
      fontSize: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    showPassRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 12,
      marginBottom: 18,
    },
    showPassText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "600",
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
    },
    modalCancelBtn: {
      flex: 1,
      height: 46,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    modalCancelText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    modalSaveBtn: {
      flex: 1.3,
      height: 46,
      borderRadius: 10,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    modalSaveText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
  });
