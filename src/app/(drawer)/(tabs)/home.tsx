import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useWatchlist } from "../../../hooks/useWatchlist";
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  IMAGE_URL,
} from "../../../services/tmdb";
import { getRecentlyViewed } from "../../../services/historyStorage";
import { Movie } from "../../../types/movie";
import type { ThemeColors } from "../../../context/ThemeContext";

type StylesType = ReturnType<typeof createStyles>;

const HorizontalMovieCard = React.memo(function HorizontalMovieCard({
  item,
  index,
  showRank = false,
  showProgress = false,
  styles,
  mutedColor,
  onPress,
}: {
  item: Movie;
  index: number;
  showRank?: boolean;
  showProgress?: boolean;
  styles: StylesType;
  mutedColor: string;
  onPress: (id: number) => void;
}) {
  const matchScore = Math.round((item.vote_average ?? 0) * 10);

  return (
    <Pressable
      style={[styles.horizontalCard, showRank && { width: 132 }]}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.posterContainer}>
        {item.poster_path ? (
          <Image
            source={{ uri: `${IMAGE_URL}w342${item.poster_path}` }}
            style={styles.horizontalPoster}
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Ionicons name="film-outline" size={26} color={mutedColor} />
          </View>
        )}


        <View style={styles.miniBrandTag}>
          <Text style={styles.miniBrandText}>C</Text>
        </View>


        <View style={styles.ratingBadge}>
          <Text style={styles.ratingBadgeText}>
            ★ {(item.vote_average ?? 0).toFixed(1)}
          </Text>
        </View>


        {showRank && index < 10 && (
          <View style={styles.rankBadgeWrap}>
            <Text style={styles.rankNumber}>{index + 1}</Text>
          </View>
        )}


        {showProgress && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(88, Math.max(25, (index + 2) * 18))}%` },
              ]}
            />
          </View>
        )}
      </View>

      <Text style={styles.horizontalTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.horizontalMeta} numberOfLines={1}>
        {matchScore >= 50 ? `${matchScore}% Match` : "Featured"}
        {item.release_date ? ` · ${item.release_date.slice(0, 4)}` : ""}
      </Text>
    </Pressable>
  );
});

const PopularMovieCard = React.memo(function PopularMovieCard({
  item,
  isSaved,
  styles,
  mutedColor,
  cardWidth,
  cardHeight,
  onPress,
  onToggleWatchlist,
}: {
  item: Movie;
  isSaved: boolean;
  styles: StylesType;
  mutedColor: string;
  cardWidth: number;
  cardHeight: number;
  onPress: (id: number) => void;
  onToggleWatchlist: (movie: Movie) => void;
}) {
  const matchScore = Math.round((item.vote_average ?? 0) * 10);

  return (
    <Pressable
      style={[styles.gridCard, { width: cardWidth }]}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.gridPosterWrap}>
        {item.poster_path ? (
          <Image
            source={{ uri: `${IMAGE_URL}w342${item.poster_path}` }}
            style={[styles.gridPoster, { height: cardHeight }]}
          />
        ) : (
          <View style={[styles.gridPlaceholder, { height: cardHeight }]}>
            <Ionicons name="film-outline" size={28} color={mutedColor} />
          </View>
        )}

        <Pressable
          style={[
            styles.gridWatchlistBtn,
            isSaved && styles.gridWatchlistBtnActive,
          ]}
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            onToggleWatchlist(item);
          }}
        >
          <Ionicons
            name={isSaved ? "checkmark" : "add"}
            size={15}
            color="#FFFFFF"
          />
        </Pressable>

        <View style={styles.ratingBadge}>
          <Text style={styles.ratingBadgeText}>
            ★ {(item.vote_average ?? 0).toFixed(1)}
          </Text>
        </View>
      </View>

      <Text style={styles.gridTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <View style={styles.gridSubRow}>
        {matchScore >= 50 && (
          <Text style={styles.gridMatchText}>{matchScore}% Match</Text>
        )}
        <Text style={styles.gridYear}>
          {item.release_date ? item.release_date.slice(0, 4) : "Movie"}
        </Text>
      </View>
    </Pressable>
  );
});

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { items: watchlistItems, addMovie, removeMovie } = useWatchlist();

  const isLandscape = width > height;
  const numColumns = width >= 900 ? 5 : isLandscape ? 4 : 2;
  const sidePadding = Math.max(insets.left, insets.right, isLandscape ? 18 : 14);
  const gridGap = isLandscape ? 10 : 12;

  const { cardWidth, cardHeight } = useMemo(() => {
    const totalGaps = gridGap * (numColumns - 1);
    const calculatedWidth = (width - sidePadding * 2 - totalGaps) / numColumns;
    return {
      cardWidth: calculatedWidth,
      cardHeight: Math.round(calculatedWidth * (isLandscape ? 1.35 : 1.44)),
    };
  }, [width, sidePadding, numColumns, gridGap, isLandscape]);

  const [trending, setTrending] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [popular, setPopular] = useState<Movie[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Movie[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const savedIds = useMemo(
    () => new Set(watchlistItems.map((i) => i.movie.id)),
    [watchlistItems]
  );

  const loadRecentlyViewed = useCallback(async () => {
    const recent = await getRecentlyViewed();
    setRecentlyViewed(recent);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentlyViewed();
    }, [loadRecentlyViewed])
  );

  const loadInitialData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const extraPromise = Promise.all([
        getTrendingMovies(1),
        getTopRatedMovies(1),
      ]).catch(() => null);

      const popularRes = await getPopularMovies(1);

      setPopular(popularRes.results || []);
      setPage(1);
      setTotalPages(popularRes.total_pages || 1);

      setLoading(false);

      const extraData = await extraPromise;

      if (extraData) {
        const [trendingRes, topRatedRes] = extraData;
        setTrending(trendingRes.results || []);
        setTopRated(topRatedRes.results || []);
      }
    } catch {
      setError("Could not load movies. Check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || loading || page >= totalPages) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const res = await getPopularMovies(nextPage);

      setPopular((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueNew = (res.results || []).filter(
          (m) => !existingIds.has(m.id)
        );
        return [...prev, ...uniqueNew];
      });
      setPage(nextPage);
    } catch {
      
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, page, totalPages]);

  const openMovie = useCallback((movieId: number) => {
    router.push({
      pathname: "/movie/[id]",
      params: { id: String(movieId) },
    });
  }, []);

  const handleToggleWatchlist = useCallback(
    async (movie: Movie) => {
      if (savedIds.has(movie.id)) {
        await removeMovie(movie.id);
      } else {
        await addMovie(movie);
      }
    },
    [savedIds, addMovie, removeMovie]
  );

  const renderTrendingCard = useCallback(
    ({ item, index }: { item: Movie; index: number }) => (
      <HorizontalMovieCard
        item={item}
        index={index}
        showRank
        styles={styles}
        mutedColor={colors.muted}
        onPress={openMovie}
      />
    ),
    [styles, colors.muted, openMovie]
  );

  const renderRecentCard = useCallback(
    ({ item, index }: { item: Movie; index: number }) => (
      <HorizontalMovieCard
        item={item}
        index={index}
        showProgress
        styles={styles}
        mutedColor={colors.muted}
        onPress={openMovie}
      />
    ),
    [styles, colors.muted, openMovie]
  );

  const renderStandardHorizontalCard = useCallback(
    ({ item, index }: { item: Movie; index: number }) => (
      <HorizontalMovieCard
        item={item}
        index={index}
        styles={styles}
        mutedColor={colors.muted}
        onPress={openMovie}
      />
    ),
    [styles, colors.muted, openMovie]
  );

  const renderPopularItem = useCallback(
    ({ item }: { item: Movie }) => (
      <PopularMovieCard
        item={item}
        isSaved={savedIds.has(item.id)}
        styles={styles}
        mutedColor={colors.muted}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        onPress={openMovie}
        onToggleWatchlist={handleToggleWatchlist}
      />
    ),
    [
      savedIds,
      styles,
      colors.muted,
      cardWidth,
      cardHeight,
      openMovie,
      handleToggleWatchlist,
    ]
  );

  const featuredMovie = trending[0];
  const isFeaturedSaved = featuredMovie ? savedIds.has(featuredMovie.id) : false;
  const trendingList = useMemo(() => trending.slice(1, 11), [trending]);

  const heroHeight = isLandscape
    ? Math.min(Math.max(height * 0.65, 225), 280)
    : Math.min(Math.max(height * 0.45, 330), 410);

  const listHeader = useMemo(
    () => (
      <View>
        
        {featuredMovie && (
          <Pressable
            style={[styles.billboardCard, { height: heroHeight }]}
            onPress={() => openMovie(featuredMovie.id)}
          >
            <Image
              source={{
                uri: `${IMAGE_URL}w780${
                  isLandscape
                    ? featuredMovie.backdrop_path || featuredMovie.poster_path
                    : featuredMovie.poster_path || featuredMovie.backdrop_path
                }`,
              }}
              style={styles.billboardImage}
              resizeMode="cover"
            />


            <View style={styles.scrimTop} />
            <View style={styles.scrimMid} />
            <View style={styles.scrimBottom} />

            <View
              style={[
                styles.billboardContent,
                isLandscape && styles.billboardContentLandscape,
              ]}
            >
              <View style={styles.top10Row}>
                <View style={styles.top10Box}>
                  <Text style={styles.top10BoxTop}>TOP</Text>
                  <Text style={styles.top10BoxNum}>10</Text>
                </View>
                <Text style={styles.top10Label}>#1 in Movies Today</Text>
              </View>

              <Text
                style={[
                  styles.billboardTitle,
                  isLandscape && { fontSize: 22 },
                ]}
                numberOfLines={2}
              >
                {featuredMovie.title}
              </Text>

              <View style={styles.billboardMetaRow}>
                <Text style={styles.billboardMatch}>
                  {Math.round((featuredMovie.vote_average ?? 0) * 10)}% Match
                </Text>
                <Text style={styles.billboardDot}>•</Text>
                <Text style={styles.billboardMetaText}>
                  {featuredMovie.release_date?.slice(0, 4) || "2026"}
                </Text>
                <Text style={styles.billboardDot}>•</Text>
                <View style={styles.hdPill}>
                  <Text style={styles.hdPillText}>HD</Text>
                </View>
                <Text style={styles.billboardStar}>
                  ★ {(featuredMovie.vote_average ?? 0).toFixed(1)}
                </Text>
              </View>

              {featuredMovie.overview ? (
                <Text
                  style={styles.billboardOverview}
                  numberOfLines={isLandscape ? 2 : 2}
                >
                  {featuredMovie.overview}
                </Text>
              ) : null}

              <View
                style={[
                  styles.billboardActions,
                  isLandscape && { maxWidth: 340 },
                ]}
              >
                <Pressable
                  style={styles.playBtn}
                  onPress={() => openMovie(featuredMovie.id)}
                >
                  <Ionicons name="play" size={18} color="#0B0B13" />
                  <Text style={styles.playBtnText}>Details</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.myListBtn,
                    isFeaturedSaved && styles.myListBtnActive,
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleWatchlist(featuredMovie);
                  }}
                >
                  <Ionicons
                    name={isFeaturedSaved ? "checkmark" : "add"}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.myListBtnText}>
                    {isFeaturedSaved ? "In My List" : "My List"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        )}


        {recentlyViewed.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Continue Watching</Text>
              <Text style={styles.sectionHint}>Recent</Text>
            </View>
            <FlatList
              horizontal
              data={recentlyViewed}
              keyExtractor={(item) => `recent_${item.id}`}
              renderItem={renderRecentCard}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={3}
            />
          </View>
        )}


        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Top 10 Trending</Text>
            <Text style={styles.sectionHint}>This Week</Text>
          </View>
          <FlatList
            horizontal
            data={trendingList}
            keyExtractor={(item) => `trend_${item.id}`}
            renderItem={renderTrendingCard}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={3}
          />
        </View>


        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Critically Acclaimed</Text>
            <Text style={styles.sectionHint}>Top Rated</Text>
          </View>
          <FlatList
            horizontal
            data={topRated}
            keyExtractor={(item) => `top_${item.id}`}
            renderItem={renderStandardHorizontalCard}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={3}
          />
        </View>

        <View style={[styles.sectionHeaderRow, { marginBottom: 12 }]}>
          <Text style={styles.sectionTitle}>Popular on CineVerse</Text>
          <Text style={styles.sectionHint}>Explore</Text>
        </View>
      </View>
    ),
    [
      featuredMovie,
      isFeaturedSaved,
      heroHeight,
      isLandscape,
      recentlyViewed,
      trendingList,
      topRated,
      styles,
      openMovie,
      handleToggleWatchlist,
      renderRecentCard,
      renderTrendingCard,
      renderStandardHorizontalCard,
    ]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && popular.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="cloud-offline-outline"
          size={44}
          color={colors.danger}
        />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => loadInitialData()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      key={`popular_grid_${numColumns}`}
      style={styles.container}
      data={popular}
      keyExtractor={(item) => String(item.id)}
      numColumns={numColumns}
      columnWrapperStyle={[styles.gridRow, { gap: gridGap }]}
      renderItem={renderPopularItem}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.listContent,
        {
          paddingHorizontal: sidePadding,
          paddingBottom: Math.max(insets.bottom + 16, 30),
        },
      ]}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={11}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            loadInitialData(true);
            loadRecentlyViewed();
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListHeaderComponent={listHeader}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator
            color={colors.primary}
            size="small"
            style={{ marginVertical: 20 }}
          />
        ) : undefined
      }
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingTop: 10,
    },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      gap: 12,
    },
    errorText: {
      color: colors.danger,
      fontSize: 15,
      textAlign: "center",
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    retryButtonText: {
      color: "#FFFFFF",
      fontWeight: "800",
    },
    
    billboardCard: {
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 24,
      backgroundColor: "#0B0B13",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      position: "relative",
    },
    billboardImage: {
      width: "100%",
      height: "100%",
    },
    scrimTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "28%",
      backgroundColor: "rgba(8, 8, 14, 0.28)",
    },
    scrimMid: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "68%",
      backgroundColor: "rgba(8, 8, 14, 0.56)",
    },
    scrimBottom: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "46%",
      backgroundColor: "rgba(8, 8, 14, 0.84)",
    },
    billboardContent: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: 16,
    },
    billboardContentLandscape: {
      maxWidth: "68%",
      padding: 18,
    },
    top10Row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    top10Box: {
      backgroundColor: "#E50914",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    top10BoxTop: {
      color: "#FFFFFF",
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.5,
      lineHeight: 8,
    },
    top10BoxNum: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "900",
      lineHeight: 11,
    },
    top10Label: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
    billboardTitle: {
      color: "#FFFFFF",
      fontSize: 25,
      fontWeight: "900",
      letterSpacing: -0.3,
    },
    billboardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 6,
    },
    billboardMatch: {
      color: "#46D369",
      fontSize: 12,
      fontWeight: "800",
    },
    billboardDot: {
      color: "rgba(255,255,255,0.45)",
      fontSize: 11,
    },
    billboardMetaText: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 12,
      fontWeight: "600",
    },
    hdPill: {
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.45)",
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 3,
    },
    hdPillText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "800",
    },
    billboardStar: {
      color: "#FBBF24",
      fontSize: 12,
      fontWeight: "800",
    },
    billboardOverview: {
      color: "rgba(255,255,255,0.78)",
      fontSize: 12,
      lineHeight: 17,
      marginTop: 7,
    },
    billboardActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 14,
    },
    playBtn: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      backgroundColor: "#FFFFFF",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    playBtnText: {
      color: "#0B0B13",
      fontSize: 14,
      fontWeight: "800",
    },
    myListBtn: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.25)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    myListBtnActive: {
      backgroundColor: "rgba(229, 9, 20, 0.35)",
      borderColor: "#E50914",
    },
    myListBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
    
    sectionBlock: {
      marginBottom: 22,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: 11,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    sectionHint: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    horizontalList: {
      gap: 11,
    },
    horizontalCard: {
      width: 122,
    },
    posterContainer: {
      position: "relative",
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    horizontalPoster: {
      width: "100%",
      height: 178,
    },
    posterPlaceholder: {
      width: "100%",
      height: 178,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandTag: {
      position: "absolute",
      top: 7,
      left: 7,
      width: 18,
      height: 18,
      borderRadius: 4,
      backgroundColor: "#E50914",
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "900",
    },
    ratingBadge: {
      position: "absolute",
      top: 7,
      right: 7,
      backgroundColor: "rgba(11, 11, 19, 0.82)",
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
    },
    ratingBadgeText: {
      color: "#FBBF24",
      fontSize: 10,
      fontWeight: "800",
    },
    rankBadgeWrap: {
      position: "absolute",
      left: 6,
      bottom: -4,
    },
    rankNumber: {
      color: "#FFFFFF",
      fontSize: 42,
      fontWeight: "900",
      lineHeight: 46,
      textShadowColor: "rgba(0, 0, 0, 0.95)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
    },
    progressTrack: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 3.5,
      backgroundColor: "rgba(255,255,255,0.25)",
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#E50914",
    },
    horizontalTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 6,
    },
    horizontalMeta: {
      color: "#46D369",
      fontSize: 11,
      fontWeight: "700",
      marginTop: 2,
    },
    
    gridRow: {
      justifyContent: "flex-start",
      marginBottom: 14,
    },
    gridCard: {
      position: "relative",
    },
    gridPosterWrap: {
      position: "relative",
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    gridPoster: {
      width: "100%",
    },
    gridPlaceholder: {
      width: "100%",
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    gridWatchlistBtn: {
      position: "absolute",
      top: 7,
      left: 7,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "rgba(11, 11, 19, 0.78)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.28)",
      justifyContent: "center",
      alignItems: "center",
    },
    gridWatchlistBtnActive: {
      backgroundColor: "#E50914",
      borderColor: "#E50914",
    },
    gridTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 6,
    },
    gridSubRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 2,
    },
    gridMatchText: {
      color: "#46D369",
      fontSize: 11,
      fontWeight: "700",
    },
    gridYear: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "600",
    },
  });