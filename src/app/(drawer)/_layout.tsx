import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Drawer, useDrawerStatus } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, usePathname } from "expo-router";
import { signOut } from "firebase/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../services/firebase";
import { getUserProfile } from "../../services/profileStorage";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useWatchlist } from "../../hooks/useWatchlist";

const NETFLIX_RED = "#E50914";

interface CustomDrawerProps {
  navigation: {
    closeDrawer: () => void;
  };
}

type DrawerRoute =
  | "/(drawer)/(tabs)/home"
  | "/(drawer)/(tabs)/search"
  | "/(drawer)/(tabs)/watchlist"
  | "/(drawer)/(tabs)/profile"
  | "/(drawer)/watched"
  | "/(drawer)/settings";

interface MenuItemConfig {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: DrawerRoute;
  isActive: boolean;
  badge?: number;
}

function CustomDrawerContent({ navigation }: CustomDrawerProps) {
  const { colors } = useAppTheme();
  const pathname = usePathname();
  const drawerStatus = useDrawerStatus();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { items } = useWatchlist();

  const [avatarUri, setAvatarUri] = useState<string | null>(
    auth.currentUser?.photoURL ?? null,
  );
  const [profileName, setProfileName] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const loadUserProfileData = useCallback(async () => {
    try {
      const profile = await getUserProfile();
      const avatar = profile.avatarUri || auth.currentUser?.photoURL || null;

      setAvatarUri(avatar);
      setProfileName(profile.name || null);
      setImageError(false);
    } catch {
      setAvatarUri(auth.currentUser?.photoURL ?? null);
    }
  }, []);

  useEffect(() => {
    if (drawerStatus === "open") {
      loadUserProfileData();
    }
  }, [drawerStatus, pathname, loadUserProfileData]);

  const { watchlistCount, watchedCount } = useMemo(() => {
    let plan = 0;
    let watched = 0;
    for (const item of items) {
      if (item.status === "watched") watched += 1;
      else plan += 1;
    }
    return { watchlistCount: plan, watchedCount: watched };
  }, [items]);

  const currentUser = auth.currentUser;
  const displayName =
    profileName ||
    currentUser?.displayName ||
    (currentUser?.email ? currentUser.email.split("@")[0] : "CineVerse Member");
  const emailText = currentUser?.email || "Personal Cinema Space";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const browseItems: MenuItemConfig[] = [
    {
      label: "Home",
      subtitle: "Top 10 & featured picks",
      icon: "home-outline",
      activeIcon: "home",
      route: "/(drawer)/(tabs)/home",
      isActive: pathname.includes("/home"),
    },
    {
      label: "Search & Explore",
      subtitle: "Movies, genres & moods",
      icon: "search-outline",
      activeIcon: "search",
      route: "/(drawer)/(tabs)/search",
      isActive: pathname.includes("/search"),
    },
    {
      label: "My List",
      subtitle: "Saved to watch later",
      icon: "bookmark-outline",
      activeIcon: "bookmark",
      route: "/(drawer)/(tabs)/watchlist",
      isActive: pathname.includes("/watchlist"),
      badge: watchlistCount,
    },
    {
      label: "Watched History",
      subtitle: "Completed titles & stats",
      icon: "checkmark-circle-outline",
      activeIcon: "checkmark-circle",
      route: "/(drawer)/watched",
      isActive: pathname.includes("/watched"),
      badge: watchedCount,
    },
  ];

  const accountItems: MenuItemConfig[] = [
    {
      label: "My CineVerse",
      subtitle: "Profile, reviews & stats",
      icon: "person-outline",
      activeIcon: "person",
      route: "/(drawer)/(tabs)/profile",
      isActive: pathname.includes("/profile"),
    },
    {
      label: "App Settings",
      subtitle: "Theme, cache & preferences",
      icon: "settings-outline",
      activeIcon: "settings",
      route: "/(drawer)/settings",
      isActive: pathname.includes("/settings"),
    },
  ];

  const handleNavigate = (route: DrawerRoute) => {
    navigation.closeDrawer();
    router.push(route);
  };

  const handleExit = () => {
    Alert.alert(
      "Sign Out",
      "Do you want to sign out of your CineVerse account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            navigation.closeDrawer();
            try {
              await signOut(auth);
            } catch {}
            await AsyncStorage.removeItem("is_logged_in");
            router.replace("/(auth)/welcome");
          },
        },
      ],
    );
  };

  const renderMenuItem = (item: MenuItemConfig) => (
    <Pressable
      key={item.label}
      style={({ pressed }) => [
        styles.menuItem,
        isLandscape && styles.menuItemLandscape,
        item.isActive && {
          backgroundColor: `${NETFLIX_RED}1A`,
          borderColor: `${NETFLIX_RED}45`,
        },
        pressed && { opacity: 0.8 },
      ]}
      onPress={() => handleNavigate(item.route)}
    >
      {item.isActive && (
        <View
          style={[styles.activeIndicator, isLandscape && { top: 6, bottom: 6 }]}
        />
      )}

      <View
        style={[
          styles.iconBox,
          isLandscape && { width: 30, height: 30, borderRadius: 8 },
          {
            backgroundColor: item.isActive ? NETFLIX_RED : colors.card,
          },
        ]}
      >
        <Ionicons
          name={item.isActive ? item.activeIcon : item.icon}
          size={isLandscape ? 15 : 17}
          color={item.isActive ? "#FFFFFF" : colors.muted}
        />
      </View>

      <View style={styles.menuTextWrap}>
        <Text
          style={[
            styles.menuLabel,
            isLandscape && { fontSize: 13 },
            {
              color: item.isActive ? colors.text : colors.text,
              fontWeight: item.isActive ? "900" : "700",
            },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {!isLandscape && (
          <Text
            style={[styles.menuSubtitle, { color: colors.muted }]}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        )}
      </View>

      {typeof item.badge === "number" && item.badge > 0 && (
        <View
          style={[
            styles.countBadge,
            isLandscape && { height: 20, minWidth: 22 },
            {
              backgroundColor: item.isActive ? NETFLIX_RED : colors.card,
              borderColor: item.isActive ? NETFLIX_RED : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.countBadgeText,
              { color: item.isActive ? "#FFFFFF" : colors.text },
            ]}
          >
            {item.badge}
          </Text>
        </View>
      )}
    </Pressable>
  );

  const renderHeaderAndProfile = () => (
    <>
      <View
        style={[
          styles.brandHeader,
          isLandscape && { marginBottom: 10, gap: 9 },
        ]}
      >
        <View
          style={[
            styles.brandLogoSquare,
            isLandscape && { width: 28, height: 28, borderRadius: 6 },
          ]}
        >
          <Text
            style={[styles.brandLogoLetter, isLandscape && { fontSize: 16 }]}
          >
            C
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.brandTitle,
              isLandscape && { fontSize: 16, letterSpacing: 1.5 },
              { color: colors.text },
            ]}
          >
            CINE<Text style={{ color: NETFLIX_RED }}>VERSE</Text>
          </Text>
          {!isLandscape && (
            <Text style={[styles.brandSubtitle, { color: colors.muted }]}>
              STREAMING GUIDE
            </Text>
          )}
        </View>

        <Pressable
          style={[
            styles.closeDrawerBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          hitSlop={8}
          onPress={() => navigation.closeDrawer()}
        >
          <Ionicons name="close" size={16} color={colors.muted} />
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.profileCard,
          isLandscape && { padding: 10, borderRadius: 12, marginBottom: 12 },
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        onPress={() => handleNavigate("/(drawer)/(tabs)/profile")}
      >
        <View style={styles.profileTopRow}>
          {avatarUri && !imageError ? (
            <Image
              source={{ uri: avatarUri }}
              style={[
                styles.avatarSquareImg,
                isLandscape && { width: 36, height: 36, borderRadius: 9 },
              ]}
              onError={() => setImageError(true)}
            />
          ) : (
            <View
              style={[
                styles.avatarSquareFallback,
                isLandscape && { width: 36, height: 36, borderRadius: 9 },
              ]}
            >
              <Text
                style={[styles.avatarText, isLandscape && { fontSize: 15 }]}
              >
                {avatarLetter}
              </Text>
            </View>
          )}

          <View style={styles.profileInfo}>
            <View style={styles.nameWithBadge}>
              <Text
                style={[
                  styles.profileName,
                  isLandscape && { fontSize: 13 },
                  { color: colors.text },
                ]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <View style={styles.ultraHdPill}>
                <Text style={styles.ultraHdText}>HD</Text>
              </View>
            </View>
            <Text
              style={[styles.profileEmail, { color: colors.muted }]}
              numberOfLines={1}
            >
              {emailText}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </View>

        {!isLandscape && (
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <Pressable
              style={styles.statBox}
              onPress={() => handleNavigate("/(drawer)/(tabs)/watchlist")}
            >
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {watchlistCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>
                My List
              </Text>
            </Pressable>

            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />

            <Pressable
              style={styles.statBox}
              onPress={() => handleNavigate("/(drawer)/watched")}
            >
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {watchedCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>
                Watched
              </Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    </>
  );

  const renderMenuSections = () => (
    <>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccent} />
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>
          BROWSE
        </Text>
      </View>
      <View style={[styles.menuList, isLandscape && { gap: 3 }]}>
        {browseItems.map(renderMenuItem)}
      </View>

      <View
        style={[styles.sectionHeaderRow, { marginTop: isLandscape ? 12 : 18 }]}
      >
        <View style={styles.sectionAccent} />
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>
          ACCOUNT
        </Text>
      </View>
      <View style={[styles.menuList, isLandscape && { gap: 3 }]}>
        {accountItems.map(renderMenuItem)}
      </View>
    </>
  );

  const renderLogoutButton = () => (
    <Pressable
      style={({ pressed }) => [
        styles.exitButton,
        isLandscape && { paddingVertical: 10, borderRadius: 10 },
        pressed && { opacity: 0.8 },
      ]}
      onPress={handleExit}
    >
      <Ionicons
        name="log-out-outline"
        size={isLandscape ? 17 : 19}
        color={NETFLIX_RED}
      />
      <Text style={[styles.exitText, isLandscape && { fontSize: 13 }]}>
        Sign Out
      </Text>
    </Pressable>
  );

  if (isLandscape) {
    return (
      <View
        style={[
          styles.drawerContainer,
          {
            backgroundColor: colors.surface,
            paddingLeft: Math.max(insets.left + 8, 14),
            paddingRight: 14,
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: Math.max(insets.top + 8, 12),
            paddingBottom: Math.max(insets.bottom + 12, 16),
          }}
        >
          {renderHeaderAndProfile()}
          {renderMenuSections()}
          <View style={{ marginTop: 14 }}>{renderLogoutButton()}</View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.drawerContainer,
        {
          backgroundColor: colors.surface,
          paddingTop: Math.max(insets.top + 12, 48),
          paddingLeft: Math.max(insets.left, 14),
          paddingRight: 14,
        },
      ]}
    >
      {renderHeaderAndProfile()}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderMenuSections()}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom + 10, 18),
          },
        ]}
      >
        {renderLogoutButton()}
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  useEffect(() => {
    const verifySession = async () => {
      const isLoggedIn = await AsyncStorage.getItem("is_logged_in");
      if (isLoggedIn !== "true") {
        router.replace("/(auth)/welcome");
      }
    };
    verifySession();
  }, []);

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStatusBarHeight: isLandscape ? 16 : undefined,
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "900",
          letterSpacing: 0.4,
        },
        headerRight: () => (
          <Pressable
            style={styles.headerSearchBtn}
            hitSlop={8}
            onPress={() => router.push("/(drawer)/(tabs)/search")}
          >
            <Ionicons name="search" size={20} color={colors.text} />
          </Pressable>
        ),
        drawerStyle: {
          backgroundColor: colors.surface,
          width: isLandscape ? 320 : 295,
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: "CINEVERSE",
          drawerLabel: "Home",
          headerTitleStyle: {
            fontWeight: "900",
            letterSpacing: 2,
            color: NETFLIX_RED,
          },
        }}
      />

      <Drawer.Screen
        name="watched"
        options={{
          title: "Watched History",
          drawerLabel: "Watched Movies",
        }}
      />

      <Drawer.Screen
        name="settings"
        options={{
          title: "Settings",
          drawerLabel: "Settings",
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  headerSearchBtn: {
    marginRight: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  brandHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  brandLogoSquare: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: NETFLIX_RED,
    justifyContent: "center",
    alignItems: "center",
  },
  brandLogoLetter: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 1,
  },
  closeDrawerBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarSquareImg: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: NETFLIX_RED,
  },
  avatarSquareFallback: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: NETFLIX_RED,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
  },
  nameWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileName: {
    fontSize: 14,
    fontWeight: "900",
    flexShrink: 1,
  },
  ultraHdPill: {
    borderWidth: 1,
    borderColor: `${NETFLIX_RED}90`,
    backgroundColor: `${NETFLIX_RED}1A`,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ultraHdText: {
    color: NETFLIX_RED,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  profileEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 15,
    fontWeight: "900",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  scrollContent: {
    paddingBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  sectionAccent: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: NETFLIX_RED,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  menuList: {
    gap: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative",
    overflow: "hidden",
  },
  menuItemLandscape: {
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 10,
    gap: 10,
  },
  activeIndicator: {
    position: "absolute",
    left: 0,
    top: 9,
    bottom: 9,
    width: 3.5,
    backgroundColor: NETFLIX_RED,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
  },
  menuSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  countBadge: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  exitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 11,
    backgroundColor: `${NETFLIX_RED}16`,
    borderWidth: 1,
    borderColor: `${NETFLIX_RED}40`,
  },
  exitText: {
    color: NETFLIX_RED,
    fontSize: 14,
    fontWeight: "800",
  },
});
