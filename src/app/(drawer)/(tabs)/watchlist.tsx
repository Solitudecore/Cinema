import { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWatchlist } from "../../../hooks/useWatchlist";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { IMAGE_URL } from "../../../services/tmdb";
import { Movie } from "../../../types/movie";
import type { ThemeColors } from "../../../context/ThemeContext";

type SortMode = "recent" | "rating" | "title";

const SORT_TABS: { key: SortMode; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "rating", label: "Top Rated" },
  { key: "title", label: "A–Z" },
];

export default function WatchlistScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLandscape = width > height;
  const numColumns = isLandscape ? 2 : 1;
  const sidePadding = Math.max(insets.left, insets.right, isLandscape ? 18 : 16);
  const gridGap = 12;

  const cardWidth = useMemo(() => {
    if (!isLandscape) return undefined;
    return (width - sidePadding * 2 - gridGap) / 2;
  }, [isLandscape, width, sidePadding]);

  const { items, isLoading, removeMovie, updateStatus } = useWatchlist();
  const [movieToRemove, setMovieToRemove] = useState<Movie | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("recent");

  const watchlist = useMemo(() => {
    const planned = items.filter((item) => item.status === "plan_to_watch");

    return [...planned].sort((a, b) => {
      if (sortBy === "rating") {
        return (b.movie.vote_average ?? 0) - (a.movie.vote_average ?? 0);
      }
      if (sortBy === "title") {
        return (a.movie.title || "").localeCompare(b.movie.title || "");
      }
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
  }, [items, sortBy]);

  const openMovie = (movieId: number) => {
    router.push({
      pathname: "/movie/[id]",
      params: {
        id: String(movieId),
      },
    });
  };

  const confirmRemove = async () => {
    if (!movieToRemove) return;
    await removeMovie(movieToRemove.id);
    setMovieToRemove(null);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: sidePadding,
          paddingTop: isLandscape ? 8 : 14,
        },
      ]}
    >
      
      <View
        style={[
          styles.headerBlock,
          isLandscape && styles.headerBlockLandscape,
        ]}
      >
        <View style={styles.titleGroup}>
          <View style={styles.myListBadge}>
            <Text style={styles.myListBadgeText}>MY LIST</Text>
          </View>
          <View style={styles.titleRow}>
            <Text style={[styles.title, isLandscape && { fontSize: 20 }]}>
              Watchlist
            </Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{watchlist.length}</Text>
            </View>
          </View>
        </View>

        {watchlist.length > 0 && (
          <View style={styles.sortRow}>
            {SORT_TABS.map((tab) => {
              const active = sortBy === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.sortPill, active && styles.sortPillActive]}
                  onPress={() => setSortBy(tab.key)}
                >
                  <Text
                    style={[
                      styles.sortPillText,
                      active && styles.sortPillTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <FlatList
        key={`watchlist_grid_${numColumns}`}
        data={watchlist}
        keyExtractor={(item) => String(item.movie.id)}
        numColumns={numColumns}
        columnWrapperStyle={
          numColumns > 1 ? { gap: gridGap, marginBottom: 12 } : undefined
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(insets.bottom + 16, 30) },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name="bookmark-outline"
                size={34}
                color="#E50914"
              />
            </View>

            <Text style={styles.emptyTitle}>Your List is Empty</Text>

            <Text style={styles.emptyDescription}>
              Save movies you want to watch later and build your personal
              cinema queue.
            </Text>

            <Pressable
              style={styles.exploreButton}
              onPress={() => router.replace("/(drawer)/(tabs)/home")}
            >
              <Ionicons name="compass" size={18} color="#FFFFFF" />
              <Text style={styles.exploreText}>Browse Movies</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const matchScore = Math.round((item.movie.vote_average ?? 0) * 10);

          return (
            <Pressable
              style={[
                styles.card,
                isLandscape && styles.cardLandscape,
                cardWidth
                  ? { width: cardWidth, marginBottom: 0 }
                  : { marginBottom: 12 },
              ]}
              onPress={() => openMovie(item.movie.id)}
            >
              <View style={styles.posterWrap}>
                {item.movie.poster_path ? (
                  <Image
                    source={{
                      uri: `${IMAGE_URL}w342${item.movie.poster_path}`,
                    }}
                    style={[
                      styles.poster,
                      isLandscape && { width: 76, height: 112 },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.posterPlaceholder,
                      isLandscape && { width: 76, height: 112 },
                    ]}
                  >
                    <Ionicons
                      name="film-outline"
                      size={24}
                      color={colors.muted}
                    />
                  </View>
                )}

                <View style={styles.miniBrandTag}>
                  <Text style={styles.miniBrandText}>C</Text>
                </View>
              </View>

              <View style={styles.details}>
                <Text
                  style={[styles.movieTitle, isLandscape && { fontSize: 15 }]}
                  numberOfLines={1}
                >
                  {item.movie.title}
                </Text>

                <View style={styles.metaRow}>
                  {matchScore >= 50 && (
                    <Text style={styles.matchText}>{matchScore}% Match</Text>
                  )}

                  <Text style={styles.rating}>
                    ★ {(item.movie.vote_average ?? 0).toFixed(1)}
                  </Text>

                  {item.movie.release_date ? (
                    <Text style={styles.year}>
                      {item.movie.release_date.slice(0, 4)}
                    </Text>
                  ) : null}
                </View>

                <Text
                  style={styles.overview}
                  numberOfLines={isLandscape ? 1 : 2}
                >
                  {item.movie.overview ||
                    `Saved on ${new Date(item.addedAt).toLocaleDateString()}`}
                </Text>

                <View style={styles.actions}>
                  <Pressable
                    style={styles.watchedButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      updateStatus(item.movie.id, "watched");
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color="#0B0B13"
                    />
                    <Text style={styles.watchedText}>Watched</Text>
                  </Pressable>

                  <Pressable
                    style={styles.removeButton}
                    hitSlop={6}
                    onPress={(e) => {
                      e.stopPropagation();
                      setMovieToRemove(item.movie);
                    }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={colors.danger}
                    />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
      />


      <Modal
        visible={movieToRemove !== null}
        transparent
        statusBarTranslucent
        animationType="fade"
        supportedOrientations={["portrait", "landscape"]}
        onRequestClose={() => setMovieToRemove(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMovieToRemove(null)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Ionicons name="trash-outline" size={26} color={colors.danger} />
            </View>

            <Text style={styles.modalTitle}>Remove from My List?</Text>
            <Text style={styles.modalMessage}>
              Remove{" "}
              <Text style={styles.modalMovieName}>
                {movieToRemove?.title}
              </Text>{" "}
              from your watchlist?
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setMovieToRemove(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.modalConfirmBtn}
                onPress={confirmRemove}
              >
                <Text style={styles.modalConfirmText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    headerBlock: {
      marginBottom: 14,
      gap: 12,
    },
    headerBlockLandscape: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    titleGroup: {
      gap: 3,
    },
    myListBadge: {
      alignSelf: "flex-start",
      backgroundColor: "#E50914",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 4,
    },
    myListBadgeText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.2,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    title: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "900",
      letterSpacing: -0.3,
    },
    countPill: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 9,
      paddingVertical: 2,
      borderRadius: 12,
    },
    countPillText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "800",
    },
    sortRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    sortPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sortPillActive: {
      backgroundColor: "#FFFFFF",
      borderColor: "#FFFFFF",
    },
    sortPillText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
    },
    sortPillTextActive: {
      color: "#0B0B13",
      fontWeight: "800",
    },
    list: {
      flexGrow: 1,
    },
    card: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    cardLandscape: {
      padding: 9,
      gap: 10,
    },
    posterWrap: {
      position: "relative",
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    poster: {
      width: 88,
      height: 128,
    },
    posterPlaceholder: {
      width: 88,
      height: 128,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandTag: {
      position: "absolute",
      top: 6,
      left: 6,
      width: 17,
      height: 17,
      borderRadius: 4,
      backgroundColor: "#E50914",
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "900",
    },
    details: {
      flex: 1,
      justifyContent: "space-between",
    },
    movieTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    },
    matchText: {
      color: "#46D369",
      fontSize: 12,
      fontWeight: "800",
    },
    rating: {
      color: "#FBBF24",
      fontSize: 12,
      fontWeight: "700",
    },
    year: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600",
    },
    overview: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 4,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    watchedButton: {
      flex: 1,
      height: 34,
      borderRadius: 8,
      backgroundColor: "#FFFFFF",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    watchedText: {
      color: "#0B0B13",
      fontSize: 12,
      fontWeight: "800",
    },
    removeButton: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: `${colors.danger}16`,
      borderWidth: 1,
      borderColor: `${colors.danger}35`,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "rgba(229, 9, 20, 0.14)",
      borderWidth: 1,
      borderColor: "rgba(229, 9, 20, 0.3)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
    },
    emptyDescription: {
      color: colors.muted,
      textAlign: "center",
      fontSize: 14,
      marginTop: 8,
      lineHeight: 20,
      maxWidth: 320,
    },
    exploreButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#E50914",
      paddingHorizontal: 22,
      paddingVertical: 13,
      borderRadius: 10,
      marginTop: 22,
    },
    exploreText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.72)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    modalCard: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 22,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalIconBox: {
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor: `${colors.danger}18`,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 14,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 8,
    },
    modalMessage: {
      color: colors.muted,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 22,
    },
    modalMovieName: {
      color: colors.text,
      fontWeight: "800",
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
      width: "100%",
    },
    modalCancelBtn: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    modalCancelText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    modalConfirmBtn: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      backgroundColor: "#E50914",
      justifyContent: "center",
      alignItems: "center",
    },
    modalConfirmText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
  });