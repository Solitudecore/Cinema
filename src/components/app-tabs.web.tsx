import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from "expo-router/ui";
import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaxContentWidth } from "@/constants/theme";

const NETFLIX_RED = "#E50914";
const BAR_BG = "rgba(13, 13, 21, 0.94)";
const BAR_BORDER = "rgba(255, 255, 255, 0.12)";

type CineTabButtonProps = TabTriggerSlotProps & {
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/(drawer)/(tabs)/home" asChild>
            <TabButton icon="home">Home</TabButton>
          </TabTrigger>

          <TabTrigger name="search" href="/(drawer)/(tabs)/search" asChild>
            <TabButton icon="search">Search</TabButton>
          </TabTrigger>

          <TabTrigger
            name="watchlist"
            href="/(drawer)/(tabs)/watchlist"
            asChild
          >
            <TabButton icon="bookmark">My List</TabButton>
          </TabTrigger>

          <TabTrigger name="profile" href="/(drawer)/(tabs)/profile" asChild>
            <TabButton icon="person">Profile</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  icon,
  ...props
}: CineTabButtonProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 420;

  return (
    <Pressable
      {...(props as any)}
      style={({ pressed }) => [
        styles.tabTriggerPressable,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.tabButtonView,
          isCompact && styles.tabButtonViewCompact,
          isFocused && styles.tabButtonViewActive,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={isCompact ? 13 : 14}
            color={isFocused ? "#FFFFFF" : "#9CA3AF"}
          />
        ) : null}

        <Text
          style={[
            styles.tabButtonText,
            isCompact && { fontSize: 11 },
            isFocused && styles.tabButtonTextActive,
          ]}
          numberOfLines={1}
        >
          {children}
        </Text>

        {isFocused && <View style={styles.activeBottomLine} />}
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 480;

  return (
    <View
      {...props}
      style={[
        styles.tabListContainer,
        {
          paddingTop: Math.max(insets.top + 8, 12),
          paddingLeft: Math.max(insets.left + 12, 14),
          paddingRight: Math.max(insets.right + 12, 14),
        },
      ]}
    >
      <View
        style={[
          styles.innerContainer,
          isCompact && styles.innerContainerCompact,
        ]}
      >
        <View style={styles.brandGroup}>
          <View style={styles.brandSquare}>
            <Text style={styles.brandSquareLetter}>C</Text>
          </View>
          {!isCompact && (
            <Text style={styles.brandText}>
              CINE<Text style={{ color: NETFLIX_RED }}>VERSE</Text>
            </Text>
          )}
        </View>

        <View style={styles.triggersRow}>{props.children}</View>

        {!isCompact && (
          <View style={styles.qualityPill}>
            <Text style={styles.qualityPillText}>HD</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  innerContainer: {
    width: "100%",
    maxWidth: MaxContentWidth,
    backgroundColor: BAR_BG,
    borderWidth: 1,
    borderColor: BAR_BORDER,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  innerContainerCompact: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 6,
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
    fontSize: 16,
    fontWeight: "900",
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  triggersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  tabTriggerPressable: {
    borderRadius: 10,
  },
  pressed: {
    opacity: 0.75,
  },
  tabButtonView: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    overflow: "hidden",
  },
  tabButtonViewCompact: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
  },
  tabButtonViewActive: {
    backgroundColor: `${NETFLIX_RED}22`,
  },
  tabButtonText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  activeBottomLine: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: NETFLIX_RED,
  },
  qualityPill: {
    borderWidth: 1,
    borderColor: `${NETFLIX_RED}80`,
    backgroundColor: `${NETFLIX_RED}1A`,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  qualityPillText: {
    color: NETFLIX_RED,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
});
