import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  SectionList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Alert,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../services/firebase";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useWatchlist } from "../../hooks/useWatchlist";
import { getGenres, IMAGE_URL } from "../../services/tmdb";
import { getAllReviews } from "../../services/reviewStorage";
import { Genre } from "../../types/movie";
import { Review } from "../../types/review";
import type { ThemeColors } from "../../context/ThemeContext";

const NETFLIX_RED = "#E50914";
const NETFLIX_GREEN = "#46D369";

export default function WatchedMoviesScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLandscape = width > height;
  const numColumns = isLandscape ? 2 : 1;
  const sidePadding = Math.max(insets.left, insets.right, isLandscape ? 18 : 14);
  const gridGap = 10;

  const { items, isLoading, removeMovie } = useWatchlist();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const loadExtraData = useCallback(async () => {
    try {
      const [genreList, allReviews] = await Promise.all([
        getGenres(),
        getAllReviews(),
      ]);
      const currentUid = auth.currentUser?.uid;
      const filteredReviews = currentUid
        ? allReviews.filter((r) => r.userId === currentUid)
        : allReviews;

      setGenres(genreList);
      setReviews(filteredReviews);
    } catch {
      
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExtraData();
    }, [loadExtraData])
  );

  const watchedItems = useMemo(
    () => items.filter((item) => item.status === "watched"),
    [items]
  );

  const genreMap = useMemo(() => {
    const map: Record<number, string> = {};
    genres.forEach((g) => {
      map[g.id] = g.name;
    });
    return map;
  }, [genres]);

  const topGenre = useMemo(() => {
    if (watchedItems.length === 0) return "—";
    const counts: Record<string, number> = {};

    watchedItems.forEach((item) => {
      (item.movie.genre_ids || []).forEach((gId) => {
        const name = genreMap[gId];
        if (name) {
          counts[name] = (counts[name] || 0) + 1;
        }
      });
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "General";
  }, [watchedItems, genreMap]);

  const averagePersonalRating = useMemo(() => {
    if (reviews.length === 0) return "0.0";
    const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const sections = useMemo(() => {
    const grouped: Record<string, typeof watchedItems> = {};

    watchedItems.forEach((item) => {
      const firstGenreId = item.movie.genre_ids?.[0];
      const sectionTitle =
        (firstGenreId && genreMap[firstGenreId]) || "Other Titles";

      if (!grouped[sectionTitle]) {
        grouped[sectionTitle] = [];
      }
      grouped[sectionTitle].push(item);
    });

    return Object.entries(grouped).map(([title, list]) => {
      const rows: (typeof watchedItems)[] = [];
      for (let i = 0; i < list.length; i += numColumns) {
        rows.push(list.slice(i, i + numColumns));
      }
      return {
        title,
        totalCount: list.length,
        data: rows,
      };
    });
  }, [watchedItems, genreMap, numColumns]);

  const handleDelete = (movieId: number, title: string) => {
    Alert.alert("Remove Title", `Remove "${title}" from watched history?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeMovie(movieId),
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={NETFLIX_RED} />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.map((i) => i.movie.id).join("_")}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal: sidePadding,
            paddingTop: isLandscape ? 10 : 14,
            paddingBottom: Math.max(insets.bottom + 20, 34),
          },
        ]}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            
            <View
              style={[
                styles.pageHeader,
                isLandscape && styles.pageHeaderLandscape,
              ]}
            >
              <View>
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>HISTORY</Text>
                </View>
                <Text
                  style={[styles.pageTitle, isLandscape && { fontSize: 21 }]}
                >
                  Watched Movies
                </Text>
              </View>

              <View style={styles.totalPill}>
                <Ionicons
                  name="checkmark-done"
                  size={13}
                  color={NETFLIX_GREEN}
                />
                <Text style={styles.totalPillText}>
                  {watchedItems.length}{" "}
                  {watchedItems.length === 1 ? "Title" : "Titles"}
                </Text>
              </View>
            </View>


            <View
              style={[
                styles.statsCard,
                isLandscape && { paddingVertical: 11, marginBottom: 14 },
              ]}
            >
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{watchedItems.length}</Text>
                <Text style={styles.statLabel}>Watched</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <Text style={styles.statValue} numberOfLines={1}>
                  {topGenre}
                </Text>
                <Text style={styles.statLabel}>Top Genre</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <Text style={styles.statValue}>
                    {averagePersonalRating}
                  </Text>
                </View>
                <Text style={styles.statLabel}>Your Avg</Text>
              </View>
            </View>
          </View>
        }
        renderSectionHeader={({ section: { title, totalCount } }) => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleGroup}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalCount}</Text>
            </View>
          </View>
        )}
        renderItem={({ item: row }) => (
          <View
            style={[
              styles.rowContainer,
              numColumns > 1 && { gap: gridGap },
            ]}
          >
            {row.map((item) => {
              const matchScore = Math.round((item.movie.vote_average ?? 0) * 10);

              return (
                <Pressable
                  key={item.movie.id}
                  style={[
                    styles.movieCard,
                    isLandscape && styles.movieCardLandscape,
                    numColumns > 1 && { flex: 1 },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/movie/[id]",
                      params: { id: String(item.movie.id) },
                    })
                  }
                >
                  <View style={styles.posterWrap}>
                    {item.movie.poster_path ? (
                      <Image
                        source={{
                          uri: `${IMAGE_URL}w185${item.movie.poster_path}`,
                        }}
                        style={[
                          styles.poster,
                          isLandscape && { width: 54, height: 80 },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.posterPlaceholder,
                          isLandscape && { width: 54, height: 80 },
                        ]}
                      >
                        <Ionicons
                          name="film-outline"
                          size={22}
                          color={colors.muted}
                        />
                      </View>
                    )}

                    <View style={styles.miniBrandTag}>
                      <Text style={styles.miniBrandText}>C</Text>
                    </View>

   <View style={styles.completedBar} />
                  </View>

                  <View style={styles.movieInfo}>
                    <Text
                      style={[
                        styles.movieTitle,
                        isLandscape && { fontSize: 14 },
                      ]}
                      numberOfLines={1}
                    >
                      {item.movie.title}
                    </Text>

                    <View style={styles.metaRow}>
                      {matchScore >= 50 && (
                        <Text style={styles.matchText}>
                          {matchScore}% Match
                        </Text>
                      )}
                      <Text style={styles.movieMeta}>
                        ★ {(item.movie.vote_average ?? 0).toFixed(1)}
                      </Text>
                      <Text style={styles.yearText}>
                        {item.movie.release_date?.slice(0, 4) || "N/A"}
                      </Text>
                    </View>

                    <View style={styles.watchedTag}>
                      <Ionicons
                        name="checkmark-circle"
                        size={13}
                        color={NETFLIX_GREEN}
                      />
                      <Text style={styles.watchedTagText}>Completed</Text>
                    </View>
                  </View>

                  <Pressable
                    style={styles.deleteBtn}
                    hitSlop={6}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(item.movie.id, item.movie.title);
                    }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={NETFLIX_RED}
                    />
                  </Pressable>
                </Pressable>
              );
            })}
            {numColumns > 1 && row.length === 1 && (
              <View style={{ flex: 1 }} />
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="film-outline" size={34} color={NETFLIX_RED} />
            </View>
            <Text style={styles.emptyTitle}>No Watched History Yet</Text>
            <Text style={styles.emptySub}>
              Mark movies as watched from My List to track your favorite genres
              and ratings here.
            </Text>
            <Pressable
              style={styles.exploreBtn}
              onPress={() => router.push("/(drawer)/(tabs)/watchlist")}
            >
              <Ionicons name="bookmark" size={16} color="#FFFFFF" />
              <Text style={styles.exploreBtnText}>Go to My List</Text>
            </Pressable>
          </View>
        }
      />
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      flexGrow: 1,
    },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    pageHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    pageHeaderLandscape: {
      alignItems: "center",
      marginBottom: 10,
    },
    historyBadge: {
      alignSelf: "flex-start",
      backgroundColor: NETFLIX_RED,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 4,
    },
    historyBadgeText: {
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
    totalPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    totalPillText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "800",
    },
    statsCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingVertical: 15,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 18,
    },
    statBox: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 4,
    },
    statDivider: {
      width: 1,
      height: 26,
      backgroundColor: colors.border,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statValue: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "900",
    },
    statLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 6,
      marginBottom: 10,
    },
    sectionTitleGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    sectionAccentBar: {
      width: 3.5,
      height: 16,
      borderRadius: 2,
      backgroundColor: NETFLIX_RED,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    countBadge: {
      backgroundColor: `${NETFLIX_RED}1C`,
      borderWidth: 1,
      borderColor: `${NETFLIX_RED}45`,
      paddingHorizontal: 9,
      paddingVertical: 2,
      borderRadius: 10,
    },
    countText: {
      color: NETFLIX_RED,
      fontSize: 11,
      fontWeight: "900",
    },
    rowContainer: {
      flexDirection: "row",
      marginBottom: 10,
    },
    movieCard: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surface,
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    movieCardLandscape: {
      padding: 8,
      gap: 10,
    },
    posterWrap: {
      position: "relative",
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    poster: {
      width: 58,
      height: 86,
    },
    posterPlaceholder: {
      width: 58,
      height: 86,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandTag: {
      position: "absolute",
      top: 4,
      left: 4,
      width: 15,
      height: 15,
      borderRadius: 3.5,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandText: {
      color: "#FFFFFF",
      fontSize: 8.5,
      fontWeight: "900",
    },
    completedBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
      backgroundColor: NETFLIX_RED,
    },
    movieInfo: {
      flex: 1,
    },
    movieTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 4,
    },
    matchText: {
      color: NETFLIX_GREEN,
      fontSize: 11,
      fontWeight: "800",
    },
    movieMeta: {
      color: "#FBBF24",
      fontSize: 11,
      fontWeight: "700",
    },
    yearText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "600",
    },
    watchedTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 6,
    },
    watchedTagText: {
      color: NETFLIX_GREEN,
      fontSize: 11,
      fontWeight: "800",
    },
    deleteBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: `${NETFLIX_RED}16`,
      borderWidth: 1,
      borderColor: `${NETFLIX_RED}35`,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 44,
      paddingHorizontal: 24,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: `${NETFLIX_RED}18`,
      borderWidth: 1,
      borderColor: `${NETFLIX_RED}38`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "900",
    },
    emptySub: {
      color: colors.muted,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 20,
      marginTop: 8,
      marginBottom: 22,
      maxWidth: 320,
    },
    exploreBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: NETFLIX_RED,
      paddingHorizontal: 22,
      paddingVertical: 13,
      borderRadius: 10,
    },
    exploreBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
  });