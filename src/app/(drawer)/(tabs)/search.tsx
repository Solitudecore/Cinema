import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  FlatList,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useWatchlist } from "../../../hooks/useWatchlist";
import {
  discoverMovies,
  getGenres,
  IMAGE_URL,
  searchMovies,
} from "../../../services/tmdb";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from "../../../services/historyStorage";
import { Genre, Movie } from "../../../types/movie";
import type { ThemeColors } from "../../../context/ThemeContext";

const NETFLIX_RED = "#E50914";
const NETFLIX_GREEN = "#46D369";

type SortOption = "popular" | "top_rated" | "newest" | "most_voted";
type EraOption = "all" | "2025_2026" | "2020s" | "2010s" | "2000s" | "classic";

const SORT_OPTIONS: {
  key: SortOption;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "popular", label: "Most Popular", icon: "flame-outline" },
  { key: "top_rated", label: "Top Rated", icon: "star-outline" },
  { key: "newest", label: "Newest Releases", icon: "calendar-outline" },
  { key: "most_voted", label: "Blockbusters", icon: "trending-up-outline" },
];

const RATING_OPTIONS = [0, 6, 7, 7.5, 8, 8.5];

const ERA_OPTIONS: {
  key: EraOption;
  label: string;
  from?: number;
  to?: number;
}[] = [
  { key: "all", label: "All Years" },
  { key: "2025_2026", label: "2025–2026", from: 2025, to: 2026 },
  { key: "2020s", label: "2020s", from: 2020, to: 2024 },
  { key: "2010s", label: "2010s", from: 2010, to: 2019 },
  { key: "2000s", label: "2000s", from: 2000, to: 2009 },
  { key: "classic", label: "Classics (<2000)", to: 1999 },
];

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "all", label: "All Languages" },
  { code: "en", label: "English" },
  { code: "ru", label: "Russian" },
  { code: "tr", label: "Turkish" },
  { code: "ko", label: "Korean" },
  { code: "ja", label: "Japanese" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
];

type ExtendedMovie = Movie & {
  original_language?: string;
  vote_count?: number;
  popularity?: number;
};

export default function SearchScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { items: watchlistItems, addMovie, removeMovie } = useWatchlist();

  const isLandscape = width > height;
  const numColumns = isLandscape ? 2 : 1;
  const sidePadding = Math.max(
    insets.left,
    insets.right,
    isLandscape ? 18 : 14,
  );
  const gridGap = 10;

  const cardWidth = useMemo(() => {
    if (!isLandscape) return undefined;
    return (width - sidePadding * 2 - gridGap) / 2;
  }, [isLandscape, width, sidePadding]);

  const [query, setQuery] = useState("");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedEra, setSelectedEra] = useState<EraOption>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [movies, setMovies] = useState<ExtendedMovie[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const genreMap = useMemo(
    () => new Map(genres.map((g) => [g.id, g.name])),
    [genres],
  );

  const savedIds = useMemo(
    () => new Set(watchlistItems.map((i) => i.movie.id)),
    [watchlistItems],
  );

  const activeFilterCount = useMemo(() => {
    let count = selectedGenres.length;
    if (minRating > 0) count += 1;
    if (selectedEra !== "all") count += 1;
    if (selectedLanguage !== "all") count += 1;
    if (sortBy !== "popular") count += 1;
    return count;
  }, [selectedGenres, minRating, selectedEra, selectedLanguage, sortBy]);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const genreList = await getGenres();
        setGenres(genreList);
      } catch {}
    };

    loadGenres();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadRecentSearches = async () => {
        try {
          const savedSearches = await getRecentSearches();

          if (isActive) {
            setRecentSearches(savedSearches);
          }
        } catch {
          if (isActive) {
            setRecentSearches([]);
          }
        }
      };

      loadRecentSearches();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const applyNetflixFiltersAndSort = useCallback(
    (rawList: ExtendedMovie[]) => {
      const eraObj = ERA_OPTIONS.find((e) => e.key === selectedEra);

      const filtered = rawList.filter((m) => {
        if (selectedGenres.length > 0) {
          const movieGenres = m.genre_ids || [];
          const matchesAll = selectedGenres.every((id) =>
            movieGenres.includes(id),
          );
          if (!matchesAll) return false;
        }

        if (minRating > 0 && (m.vote_average ?? 0) < minRating) {
          return false;
        }

        if (eraObj && eraObj.key !== "all") {
          const year = m.release_date
            ? Number(m.release_date.slice(0, 4))
            : NaN;
          if (Number.isNaN(year)) return false;
          if (eraObj.from && year < eraObj.from) return false;
          if (eraObj.to && year > eraObj.to) return false;
        }

        if (
          selectedLanguage !== "all" &&
          m.original_language &&
          m.original_language !== selectedLanguage
        ) {
          return false;
        }

        return true;
      });

      if (sortBy === "popular") return filtered;

      return [...filtered].sort((a, b) => {
        if (sortBy === "top_rated") {
          return (b.vote_average ?? 0) - (a.vote_average ?? 0);
        }
        if (sortBy === "newest") {
          return (b.release_date || "").localeCompare(a.release_date || "");
        }
        if (sortBy === "most_voted") {
          return (b.vote_count ?? 0) - (a.vote_count ?? 0);
        }
        return 0;
      });
    },
    [selectedGenres, minRating, selectedEra, selectedLanguage, sortBy],
  );

  const fetchMovies = useCallback(
    async (targetPage = 1, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError("");

        const trimmed = query.trim();
        const primaryGenre = selectedGenres[0] ?? null;

        const response = trimmed
          ? await searchMovies(trimmed, targetPage)
          : await discoverMovies(targetPage, primaryGenre, minRating);

        const rawResults = (response.results || []) as ExtendedMovie[];
        const processed = applyNetflixFiltersAndSort(rawResults);

        setMovies((prev) => {
          if (!append) return processed;
          const existingIds = new Set(prev.map((m) => m.id));
          return [...prev, ...processed.filter((m) => !existingIds.has(m.id))];
        });
        setPage(targetPage);
        setTotalPages(response.total_pages || 1);

        if (trimmed && targetPage === 1 && processed.length > 0) {
          const updated = await addRecentSearch(trimmed);
          setRecentSearches(updated);
        }
      } catch {
        setError("Could not search movies. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, selectedGenres, minRating, applyNetflixFiltersAndSort],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMovies(1, false);
    }, 320);

    return () => clearTimeout(timer);
  }, [fetchMovies]);

  const handleLoadMore = () => {
    if (loadingMore || loading || page >= totalPages) return;
    fetchMovies(page + 1, true);
  };

  const handleClearHistory = async () => {
    try {
      await clearRecentSearches();
      setRecentSearches([]);
    } catch {}
  };

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId],
    );
  };

  const resetAllFilters = () => {
    setSelectedGenres([]);
    setMinRating(0);
    setSelectedEra("all");
    setSelectedLanguage("all");
    setSortBy("popular");
  };

  const cycleSort = () => {
    const idx = SORT_OPTIONS.findIndex((s) => s.key === sortBy);
    const next = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length];
    setSortBy(next.key);
  };

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.key === sortBy)?.label || "Most Popular";

  const renderQuickPills = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.ribbonRow}
    >
      <Pressable
        style={[
          styles.quickPill,
          sortBy !== "popular" && styles.quickPillActive,
        ]}
        onPress={cycleSort}
      >
        <Ionicons
          name="swap-vertical"
          size={13}
          color={sortBy !== "popular" ? "#FFFFFF" : colors.text}
        />
        <Text
          style={[
            styles.quickPillText,
            sortBy !== "popular" && styles.quickPillTextActive,
          ]}
        >
          {currentSortLabel}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.quickPill, minRating > 0 && styles.quickPillActive]}
        onPress={() => setMinRating((prev) => (prev === 7.5 ? 0 : 7.5))}
      >
        <Text
          style={[
            styles.quickPillText,
            minRating > 0 && styles.quickPillTextActive,
          ]}
        >
          {minRating > 0 ? `★ ${minRating}+` : "★ 7.5+ Top"}
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.quickPill,
          selectedEra === "2025_2026" && styles.quickPillActive,
        ]}
        onPress={() =>
          setSelectedEra((prev) => (prev === "2025_2026" ? "all" : "2025_2026"))
        }
      >
        <Text
          style={[
            styles.quickPillText,
            selectedEra === "2025_2026" && styles.quickPillTextActive,
          ]}
        >
          New & Hot
        </Text>
      </Pressable>

      {genres.map((genre) => {
        const active = selectedGenres.includes(genre.id);
        return (
          <Pressable
            key={genre.id}
            style={[styles.quickPill, active && styles.quickPillActive]}
            onPress={() => toggleGenre(genre.id)}
          >
            <Text
              style={[
                styles.quickPillText,
                active && styles.quickPillTextActive,
              ]}
            >
              {genre.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderMovieItem = ({ item }: { item: ExtendedMovie }) => {
    const isSaved = savedIds.has(item.id);
    const matchPercent = Math.round((item.vote_average ?? 0) * 10);
    const movieGenreNames = (item.genre_ids || [])
      .slice(0, isLandscape ? 2 : 3)
      .map((id) => genreMap.get(id))
      .filter(Boolean)
      .join(" · ");

    return (
      <Pressable
        style={[
          styles.movieCard,
          isLandscape && styles.movieCardLandscape,
          cardWidth ? { width: cardWidth } : undefined,
        ]}
        onPress={() =>
          router.push({
            pathname: "/movie/[id]",
            params: { id: String(item.id) },
          })
        }
      >
        <View style={styles.posterWrap}>
          {item.poster_path ? (
            <Image
              source={{ uri: `${IMAGE_URL}w185${item.poster_path}` }}
              style={[styles.poster, isLandscape && { width: 58, height: 84 }]}
            />
          ) : (
            <View
              style={[
                styles.posterFallback,
                isLandscape && { width: 58, height: 84 },
              ]}
            >
              <Ionicons name="film-outline" size={22} color={colors.muted} />
            </View>
          )}

          <View style={styles.miniBrandTag}>
            <Text style={styles.miniBrandText}>C</Text>
          </View>
        </View>

        <View style={styles.movieInfo}>
          <Text
            style={[styles.movieTitle, isLandscape && { fontSize: 14 }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <View style={[styles.metaRow, isLandscape && { marginTop: 3 }]}>
            {matchPercent >= 50 ? (
              <Text style={styles.matchText}>{matchPercent}% Match</Text>
            ) : (
              <Text style={styles.ratingText}>
                ★ {(item.vote_average ?? 0).toFixed(1)}
              </Text>
            )}

            <Text style={styles.yearText}>
              {item.release_date ? item.release_date.slice(0, 4) : "N/A"}
            </Text>

            <View style={styles.hdBadge}>
              <Text style={styles.hdBadgeText}>
                {item.original_language
                  ? item.original_language.toUpperCase()
                  : "HD"}
              </Text>
            </View>
          </View>

          {movieGenreNames ? (
            <Text style={styles.genreLine} numberOfLines={1}>
              {movieGenreNames}
            </Text>
          ) : null}

          <Text
            style={[styles.movieOverview, isLandscape && { marginTop: 3 }]}
            numberOfLines={isLandscape ? 1 : 2}
          >
            {item.overview || "No description available."}
          </Text>
        </View>

        <Pressable
          style={[
            styles.watchlistQuickBtn,
            isLandscape && { width: 32, height: 32, borderRadius: 16 },
            isSaved && styles.watchlistQuickBtnActive,
          ]}
          hitSlop={8}
          onPress={async (e) => {
            e.stopPropagation();
            if (isSaved) {
              await removeMovie(item.id);
            } else {
              await addMovie(item);
            }
          }}
        >
          <Ionicons
            name={isSaved ? "checkmark" : "add"}
            size={isLandscape ? 17 : 19}
            color={isSaved ? "#FFFFFF" : colors.text}
          />
        </Pressable>
      </Pressable>
    );
  };

  const isDefaultFeed = !query.trim() && activeFilterCount === 0;

  const listHeader = (
    <View>
      {isLandscape && (
        <View style={styles.ribbonWrapperLandscape}>{renderQuickPills()}</View>
      )}

      {activeFilterCount > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeSummaryRow}
        >
          {sortBy !== "popular" && (
            <Pressable
              style={styles.activeTag}
              onPress={() => setSortBy("popular")}
            >
              <Text style={styles.activeTagText}>{currentSortLabel}</Text>
              <Ionicons name="close" size={13} color="#FFFFFF" />
            </Pressable>
          )}

          {selectedGenres.map((gId) => (
            <Pressable
              key={gId}
              style={styles.activeTag}
              onPress={() => toggleGenre(gId)}
            >
              <Text style={styles.activeTagText}>
                {genreMap.get(gId) || "Genre"}
              </Text>
              <Ionicons name="close" size={13} color="#FFFFFF" />
            </Pressable>
          ))}

          {minRating > 0 && (
            <Pressable style={styles.activeTag} onPress={() => setMinRating(0)}>
              <Text style={styles.activeTagText}>★ {minRating}+</Text>
              <Ionicons name="close" size={13} color="#FFFFFF" />
            </Pressable>
          )}

          {selectedEra !== "all" && (
            <Pressable
              style={styles.activeTag}
              onPress={() => setSelectedEra("all")}
            >
              <Text style={styles.activeTagText}>
                {ERA_OPTIONS.find((e) => e.key === selectedEra)?.label}
              </Text>
              <Ionicons name="close" size={13} color="#FFFFFF" />
            </Pressable>
          )}

          {selectedLanguage !== "all" && (
            <Pressable
              style={styles.activeTag}
              onPress={() => setSelectedLanguage("all")}
            >
              <Text style={styles.activeTagText}>
                {
                  LANGUAGE_OPTIONS.find((l) => l.code === selectedLanguage)
                    ?.label
                }
              </Text>
              <Ionicons name="close" size={13} color="#FFFFFF" />
            </Pressable>
          )}

          <Pressable style={styles.resetPill} onPress={resetAllFilters}>
            <Text style={styles.resetPillText}>Reset All</Text>
          </Pressable>
        </ScrollView>
      )}

      {recentSearches.length > 0 && !query.trim() && (
        <View
          style={[
            styles.recentSection,
            isLandscape && {
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            },
          ]}
        >
          <View
            style={[
              styles.recentHeader,
              isLandscape && { marginBottom: 0, paddingRight: 0 },
            ]}
          >
            <Text style={styles.recentLabel}>Recent Searches</Text>
            {!isLandscape && (
              <Pressable
                style={styles.clearBtn}
                hitSlop={8}
                onPress={handleClearHistory}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {recentSearches.map((item) => (
              <Pressable
                key={item}
                style={styles.recentChip}
                onPress={() => setQuery(item)}
              >
                <Ionicons name="time-outline" size={12} color={colors.muted} />
                <Text style={styles.recentChipText}>{item}</Text>
              </Pressable>
            ))}
            {isLandscape && (
              <Pressable
                style={styles.clearBtn}
                hitSlop={8}
                onPress={handleClearHistory}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.feedHeaderRow}>
        <View style={styles.feedTitleGroup}>
          <View style={styles.feedAccentBar} />
          <Text style={styles.feedTitle}>
            {isDefaultFeed
              ? "Top Searches"
              : query.trim()
                ? `Results for "${query.trim()}"`
                : "Filtered Movies"}
          </Text>
        </View>

        <Text style={styles.feedCount}>
          {movies.length} {movies.length === 1 ? "title" : "titles"}
        </Text>
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: sidePadding,
          paddingTop: isLandscape ? 4 : 6,
        },
      ]}
    >
      <View style={[styles.searchRow, isLandscape && { marginBottom: 6 }]}>
        <View
          style={[
            styles.searchBox,
            isLandscape && { height: 40, borderRadius: 10 },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, isLandscape && { fontSize: 14 }]}
            placeholder="Search movies, genres, moods..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            disableFullscreenUI={true}
          />

          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={[
            styles.filterTriggerBtn,
            isLandscape && { height: 40, width: 44, borderRadius: 10 },
            activeFilterCount > 0 && styles.filterTriggerBtnActive,
          ]}
          onPress={() => {
            Keyboard.dismiss();
            setFilterModalVisible(true);
          }}
        >
          <Ionicons
            name="options-outline"
            size={19}
            color={activeFilterCount > 0 ? "#FFFFFF" : colors.text}
          />
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {!isLandscape && (
        <View style={styles.ribbonWrapper}>{renderQuickPills()}</View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={NETFLIX_RED} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => fetchMovies(1, false)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          key={`search_results_${numColumns}`}
          data={movies}
          keyExtractor={(item) => String(item.id)}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: gridGap } : undefined}
          renderItem={renderMovieItem}
          ListHeaderComponent={listHeader}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.resultsList,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="film-outline" size={42} color={colors.muted} />
              <Text style={styles.emptyText}>
                No titles matched your search or filters.
              </Text>
              {activeFilterCount > 0 && (
                <Pressable style={styles.retryBtn} onPress={resetAllFilters}>
                  <Text style={styles.retryText}>Reset Filters</Text>
                </Pressable>
              )}
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={NETFLIX_RED}
                size="small"
                style={{ marginVertical: 16 }}
              />
            ) : undefined
          }
        />
      )}

      <Modal
        visible={filterModalVisible}
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        animationType="slide"
        supportedOrientations={["portrait", "landscape"]}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View
          style={[
            styles.modalBackdrop,
            isLandscape && styles.modalBackdropLandscape,
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setFilterModalVisible(false)}
          />

          <View
            style={[
              styles.modalSheet,
              isLandscape && styles.modalSheetLandscape,
              {
                maxHeight: isLandscape ? "92%" : "84%",
                paddingBottom: Math.max(insets.bottom, 14),
                paddingHorizontal: Math.max(insets.left, insets.right, 18),
              },
            ]}
          >
            {!isLandscape && <View style={styles.sheetHandle} />}

            <View style={styles.sheetHeader}>
              <View style={styles.feedTitleGroup}>
                <View style={styles.feedAccentBar} />
                <Text style={styles.sheetTitle}>Filter & Sort</Text>
              </View>

              <Pressable
                style={styles.sheetCloseBtn}
                onPress={() => setFilterModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
            >
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.sortGrid}>
                {SORT_OPTIONS.map((opt) => {
                  const active = sortBy === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      style={[
                        styles.sortCard,
                        isLandscape && { width: "23.5%" },
                        active && styles.sortCardActive,
                      ]}
                      onPress={() => setSortBy(opt.key)}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={17}
                        color={active ? "#FFFFFF" : colors.muted}
                      />
                      <Text
                        style={[
                          styles.sortCardText,
                          active && styles.sortCardTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.filterSectionTitle}>
                  Genres{" "}
                  {selectedGenres.length > 0
                    ? `(${selectedGenres.length} selected)`
                    : ""}
                </Text>
                {selectedGenres.length > 0 && (
                  <Pressable
                    style={styles.clearBtn}
                    hitSlop={8}
                    onPress={() => setSelectedGenres([])}
                  >
                    <Text style={styles.clearText}>Clear</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.wrapChips}>
                {genres.map((genre) => {
                  const active = selectedGenres.includes(genre.id);
                  return (
                    <Pressable
                      key={genre.id}
                      style={[
                        styles.sheetChip,
                        active && styles.sheetChipActive,
                      ]}
                      onPress={() => toggleGenre(genre.id)}
                    >
                      <Text
                        style={[
                          styles.sheetChipText,
                          active && styles.sheetChipTextActive,
                        ]}
                      >
                        {genre.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.filterSectionTitle}>Release Year</Text>
              <View style={styles.wrapChips}>
                {ERA_OPTIONS.map((era) => {
                  const active = selectedEra === era.key;
                  return (
                    <Pressable
                      key={era.key}
                      style={[
                        styles.sheetChip,
                        active && styles.sheetChipActive,
                      ]}
                      onPress={() => setSelectedEra(era.key)}
                    >
                      <Text
                        style={[
                          styles.sheetChipText,
                          active && styles.sheetChipTextActive,
                        ]}
                      >
                        {era.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
              <View style={styles.wrapChips}>
                {RATING_OPTIONS.map((rate) => {
                  const active = minRating === rate;
                  return (
                    <Pressable
                      key={rate}
                      style={[
                        styles.sheetChip,
                        active && styles.sheetChipActive,
                      ]}
                      onPress={() => setMinRating(rate)}
                    >
                      <Text
                        style={[
                          styles.sheetChipText,
                          active && styles.sheetChipTextActive,
                        ]}
                      >
                        {rate === 0 ? "Any Rating" : `★ ${rate}+`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.filterSectionTitle}>Original Language</Text>
              <View style={styles.wrapChips}>
                {LANGUAGE_OPTIONS.map((lang) => {
                  const active = selectedLanguage === lang.code;
                  return (
                    <Pressable
                      key={lang.code}
                      style={[
                        styles.sheetChip,
                        active && styles.sheetChipActive,
                      ]}
                      onPress={() => setSelectedLanguage(lang.code)}
                    >
                      <Text
                        style={[
                          styles.sheetChipText,
                          active && styles.sheetChipTextActive,
                        ]}
                      >
                        {lang.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <Pressable
                style={[styles.sheetResetBtn, isLandscape && { height: 42 }]}
                onPress={resetAllFilters}
              >
                <Text style={styles.sheetResetText}>Reset</Text>
              </Pressable>

              <Pressable
                style={[styles.sheetApplyBtn, isLandscape && { height: 42 }]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.sheetApplyText}>
                  Show Results ({movies.length})
                </Text>
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
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 46,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
    },
    filterTriggerBtn: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    filterTriggerBtnActive: {
      backgroundColor: NETFLIX_RED,
      borderColor: NETFLIX_RED,
    },
    badge: {
      position: "absolute",
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#FFFFFF",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 4,
    },
    badgeText: {
      color: NETFLIX_RED,
      fontSize: 10,
      fontWeight: "900",
    },
    ribbonWrapper: {
      marginBottom: 8,
    },
    ribbonWrapperLandscape: {
      marginBottom: 8,
    },
    ribbonRow: {
      gap: 7,
      paddingRight: 8,
    },
    quickPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.surface,
      paddingHorizontal: 13,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickPillActive: {
      backgroundColor: NETFLIX_RED,
      borderColor: NETFLIX_RED,
    },
    quickPillText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
    },
    quickPillTextActive: {
      color: "#FFFFFF",
      fontWeight: "800",
    },
    activeSummaryRow: {
      gap: 7,
      marginBottom: 8,
    },
    activeTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: `${NETFLIX_RED}D9`,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
    },
    activeTagText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700",
    },
    resetPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: NETFLIX_RED,
    },
    resetPillText: {
      color: NETFLIX_RED,
      fontSize: 11,
      fontWeight: "800",
    },
    recentSection: {
      marginBottom: 10,
    },
    recentHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingRight: 10,
      marginBottom: 6,
    },
    recentLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
    },
    clearBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    clearText: {
      color: NETFLIX_RED,
      fontSize: 12,
      fontWeight: "700",
    },
    chipsRow: {
      gap: 8,
      alignItems: "center",
    },
    recentChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.surface,
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recentChipText: {
      color: colors.text,
      fontSize: 12,
    },
    feedHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
      marginTop: 2,
    },
    feedTitleGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    feedAccentBar: {
      width: 3.5,
      height: 16,
      borderRadius: 2,
      backgroundColor: NETFLIX_RED,
    },
    feedTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    feedCount: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    resultsList: {
      paddingTop: 2,
      gap: 10,
    },
    movieCard: {
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
      width: 66,
      height: 98,
    },
    posterFallback: {
      width: 66,
      height: 98,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandTag: {
      position: "absolute",
      top: 5,
      left: 5,
      width: 16,
      height: 16,
      borderRadius: 4,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "900",
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
      gap: 8,
      marginTop: 4,
    },
    matchText: {
      color: NETFLIX_GREEN,
      fontSize: 12,
      fontWeight: "800",
    },
    ratingText: {
      color: "#FBBF24",
      fontSize: 12,
      fontWeight: "700",
    },
    yearText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600",
    },
    hdBadge: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 3,
    },
    hdBadgeText: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: "800",
    },
    genreLine: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3,
    },
    movieOverview: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 4,
      opacity: 0.85,
    },
    watchlistQuickBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    watchlistQuickBtnActive: {
      backgroundColor: NETFLIX_RED,
      borderColor: NETFLIX_RED,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      gap: 12,
    },
    errorText: {
      color: NETFLIX_RED,
      fontSize: 14,
      textAlign: "center",
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      textAlign: "center",
    },
    retryBtn: {
      backgroundColor: NETFLIX_RED,
      paddingHorizontal: 22,
      paddingVertical: 10,
      borderRadius: 10,
    },
    retryText: {
      color: "#FFFFFF",
      fontWeight: "800",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.76)",
      justifyContent: "flex-end",
    },
    modalBackdropLandscape: {
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingTop: 10,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    modalSheetLandscape: {
      borderRadius: 20,
      borderWidth: 1,
      paddingTop: 14,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 10,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    sheetTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "900",
    },
    sheetCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    sheetScroll: {
      paddingBottom: 14,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingRight: 4,
    },
    filterSectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800",
      marginTop: 12,
      marginBottom: 8,
    },
    sortGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    sortCard: {
      width: "48.5%",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sortCardActive: {
      backgroundColor: NETFLIX_RED,
      borderColor: NETFLIX_RED,
    },
    sortCardText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
      flex: 1,
    },
    sortCardTextActive: {
      color: "#FFFFFF",
      fontWeight: "800",
    },
    wrapChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    sheetChip: {
      backgroundColor: colors.card,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sheetChipActive: {
      backgroundColor: NETFLIX_RED,
      borderColor: NETFLIX_RED,
    },
    sheetChipText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
    },
    sheetChipTextActive: {
      color: "#FFFFFF",
      fontWeight: "800",
    },
    sheetFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    sheetResetBtn: {
      height: 46,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    sheetResetText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    sheetApplyBtn: {
      flex: 1,
      height: 46,
      borderRadius: 10,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    sheetApplyText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800",
    },
  });
