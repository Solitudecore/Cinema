import {
  ComponentRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Linking,
  Modal,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TrailerPlayer from "../../components/TrailerPlayer";
import { useWatchlist } from "../../hooks/useWatchlist";
import { useAppTheme } from "../../hooks/useAppTheme";
import {
  getCachedMovieBasic,
  getMovieDetails,
  IMAGE_URL,
} from "../../services/tmdb";
import { addRecentlyViewed } from "../../services/historyStorage";
import { MovieDetails } from "../../types/movie";
import type { ThemeColors } from "../../context/ThemeContext";

const NETFLIX_RED = "#E50914";
const NETFLIX_GREEN = "#46D369";

function formatRuntime(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return "";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export default function MovieDetailsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const sidePadding = Math.max(
    insets.left,
    insets.right,
    isLandscape ? 24 : 16,
  );
  const contentWidth = width - sidePadding * 2;

  const inlineWidth = isLandscape
    ? Math.min(contentWidth, Math.round(height * 0.65 * (16 / 9)))
    : contentWidth;
  const inlineHeight = Math.round(inlineWidth * (9 / 16));

  const fsContainerWidth = isLandscape
    ? Math.max(200, width - insets.left - insets.right)
    : Math.max(200, height - insets.top - insets.bottom);
  const fsContainerHeight = isLandscape
    ? Math.max(180, height - insets.top - insets.bottom)
    : Math.max(180, width - insets.left - insets.right);

  let fullscreenWidth = fsContainerWidth;
  let fullscreenHeight = Math.round(fullscreenWidth * (9 / 16));
  if (fullscreenHeight > fsContainerHeight) {
    fullscreenHeight = fsContainerHeight;
    fullscreenWidth = Math.round(fullscreenHeight * (16 / 9));
  }

  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = Number(id);

  const initialMovie = useMemo(
    () => (movieId ? getCachedMovieBasic(movieId) : null),
    [movieId],
  );

  const [movie, setMovie] = useState<MovieDetails | null>(initialMovie);
  const [loading, setLoading] = useState(!initialMovie);
  const [error, setError] = useState("");
  const [showTrailer, setShowTrailer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPrebuffered, setIsPrebuffered] = useState(false);
  const [playerFailed, setPlayerFailed] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [trailerSectionY, setTrailerSectionY] = useState(0);

  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const movieRef = useRef<MovieDetails | null>(initialMovie);
  const requestRef = useRef(0);
  const { items, addMovie, removeMovie } = useWatchlist();

  const savedMovie = movie
    ? items.find((item) => item.movie.id === movie.id)
    : undefined;

  const loadDetails = useCallback(async () => {
    if (!movieId || Number.isNaN(movieId)) {
      setError("Invalid movie ID.");
      setLoading(false);
      return;
    }

    const requestId = ++requestRef.current;

    try {
      if (!movieRef.current) {
        setLoading(true);
      }

      setError("");

      const data = await getMovieDetails(movieId);

      if (requestId !== requestRef.current) {
        return;
      }

      movieRef.current = data;
      setMovie(data);
      setLoading(false);

      addRecentlyViewed(data).catch(() => {});
    } catch {
      if (requestId !== requestRef.current) {
        return;
      }

      if (!movieRef.current) {
        setError("Could not load movie details. Check your connection.");
      }

      setLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    movieRef.current = initialMovie;
    setMovie(initialMovie);
    setLoading(!initialMovie);
    setError("");
    setShowTrailer(false);
    setIsFullscreen(false);
    setPlayerReady(false);
    setIsPrebuffered(false);
    setPlayerFailed(false);
    loadDetails();

    return () => {
      requestRef.current += 1;
    };
  }, [initialMovie, loadDetails]);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);

      return () => {
        setIsFocused(false);
        setShowTrailer(false);
        setIsFullscreen(false);
        setPlayerReady(false);
        setIsPrebuffered(false);
        setPlayerFailed(false);
      };
    }, []),
  );

  useEffect(() => {
    if (isLandscape && showTrailer && !playerFailed) {
      setIsFullscreen(true);
    }
  }, [isLandscape, showTrailer, playerFailed]);

  if (loading && !movie) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={NETFLIX_RED} size="large" />
      </View>
    );
  }

  if (error || !movie) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={NETFLIX_RED} />
        <Text style={styles.error}>{error || "Movie not found."}</Text>
        <Pressable style={styles.retryBtn} onPress={loadDetails}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const trailer =
    movie.videos?.results?.find(
      (video) => video.site === "YouTube" && video.type === "Trailer",
    ) || movie.videos?.results?.find((video) => video.site === "YouTube");

  const thumbnailUrl = trailer
    ? `https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`
    : movie.backdrop_path
      ? `${IMAGE_URL}w500${movie.backdrop_path}`
      : undefined;

  const isInWatchlist = savedMovie?.status === "plan_to_watch";
  const isWatched = savedMovie?.status === "watched";
  const matchScore = Math.round((movie.vote_average ?? 0) * 10);
  const formattedDuration = formatRuntime(movie.runtime);
  const topCastNames = (movie.credits?.cast || [])
    .slice(0, 4)
    .map((c) => c.name)
    .join(", ");

  const openExternalYouTube = () => {
    const url = trailer
      ? `https://www.youtube.com/watch?v=${trailer.key}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(
          `${movie.title} official trailer`,
        )}`;

    Linking.openURL(url).catch(() => {});
  };

  const handlePlayPress = () => {
    if (!trailer) {
      openExternalYouTube();
      return;
    }

    setPlayerFailed(false);
    setShowTrailer(true);

    if (isLandscape) {
      setIsFullscreen(true);
    } else if (trailerSectionY > 0) {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, trailerSectionY - 16),
        animated: true,
      });
    }
  };

  const handleExitFullscreen = () => {
    setIsFullscreen(false);
    if (isLandscape) {
      setShowTrailer(false);
    }
  };

  const shouldPlayInline =
    isFocused && !isFullscreen && (showTrailer || !isPrebuffered);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      contentContainerStyle={{
        paddingBottom: Math.max(insets.bottom + 16, 32),
      }}
    >
      <View style={styles.backdropWrapper}>
        {movie.backdrop_path || movie.poster_path ? (
          <Image
            source={{
              uri: `${IMAGE_URL}w780${
                movie.backdrop_path || movie.poster_path
              }`,
            }}
            style={[styles.backdrop, isLandscape && { height: 200 }]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.backdrop,
              isLandscape && { height: 200 },
              { backgroundColor: colors.surface },
            ]}
          />
        )}

        <LinearGradient
          colors={[
            "rgba(8, 8, 14, 0.12)",
            "rgba(8, 8, 14, 0.35)",
            "rgba(8, 8, 14, 0.92)",
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.backdropGradient}
        />

        <Pressable
          style={[
            styles.backFab,
            {
              top: Math.max(insets.top + 10, 36),
              left: Math.max(insets.left + 12, 16),
            },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>

        <Pressable
          style={[
            styles.reviewTopFab,
            {
              top: Math.max(insets.top + 10, 36),
              right: Math.max(insets.right + 12, 16),
            },
          ]}
          onPress={() =>
            router.push({
              pathname: "/reviews/[movieId]",
              params: { movieId: String(movie.id) },
            })
          }
        >
          <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
          <Text style={styles.reviewTopFabText}>Reviews</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.content,
          {
            paddingLeft: sidePadding,
            paddingRight: sidePadding,
          },
        ]}
      >
        <View style={[styles.topHeaderRow, isLandscape && { marginTop: -56 }]}>
          {movie.poster_path ? (
            <View style={styles.posterFrame}>
              <Image
                source={{
                  uri: `${IMAGE_URL}w342${movie.poster_path}`,
                }}
                style={[
                  styles.poster,
                  isLandscape && { width: 98, height: 146 },
                ]}
              />
              <View style={styles.miniBrandTag}>
                <Text style={styles.miniBrandText}>C</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.headerMeta}>
            <View style={styles.filmTagRow}>
              <Text style={styles.filmTagC}>C</Text>
              <Text style={styles.filmTagText}>FILM</Text>
            </View>

            <Text
              style={[styles.title, isLandscape && { fontSize: 21 }]}
              numberOfLines={3}
            >
              {movie.title}
            </Text>

            <View style={styles.netflixMetaRow}>
              {matchScore >= 50 && (
                <Text style={styles.matchText}>{matchScore}% Match</Text>
              )}

              {movie.release_date ? (
                <Text style={styles.metaText}>
                  {movie.release_date.slice(0, 4)}
                </Text>
              ) : null}

              <View style={styles.hdPill}>
                <Text style={styles.hdPillText}>HD</Text>
              </View>

              {formattedDuration ? (
                <Text style={styles.metaText}>{formattedDuration}</Text>
              ) : null}

              <Text style={styles.starMetaText}>
                ★ {(movie.vote_average ?? 0).toFixed(1)}
              </Text>
            </View>

            {movie.tagline ? (
              <Text style={styles.tagline} numberOfLines={2}>
                “{movie.tagline}”
              </Text>
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.actionsContainer,
            isLandscape && styles.actionsContainerLandscape,
          ]}
        >
          <Pressable
            style={[styles.netflixPlayBtn, isLandscape && { flex: 1.2 }]}
            onPress={handlePlayPress}
          >
            <Ionicons name="play" size={20} color="#0B0B13" />
            <Text style={styles.netflixPlayText}>
              {trailer ? "Play Trailer" : "Search Trailer"}
            </Text>
          </Pressable>

          <View style={[styles.secondaryRow, isLandscape && { flex: 1.8 }]}>
            <Pressable
              style={[
                styles.netflixSecondaryBtn,
                isInWatchlist && styles.activeMyListBtn,
              ]}
              onPress={async () => {
                if (isInWatchlist) {
                  await removeMovie(movie.id);
                } else {
                  await addMovie(movie);
                }
              }}
            >
              <Ionicons
                name={
                  isInWatchlist ? "checkmark" : isWatched ? "refresh" : "add"
                }
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.netflixSecondaryText}>
                {isWatched
                  ? "Move to List"
                  : isInWatchlist
                    ? "In My List"
                    : "My List"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.netflixSecondaryBtn}
              onPress={() =>
                router.push({
                  pathname: "/reviews/[movieId]",
                  params: { movieId: String(movie.id) },
                })
              }
            >
              <Ionicons name="star-outline" size={18} color="#FFFFFF" />
              <Text style={styles.netflixSecondaryText}>Rate & Review</Text>
            </Pressable>
          </View>
        </View>

        {movie.overview ? (
          <View style={styles.overviewBlock}>
            <Text style={styles.overview}>{movie.overview}</Text>
            {topCastNames ? (
              <Text style={styles.starringLine} numberOfLines={2}>
                <Text style={styles.starringLabel}>Starring: </Text>
                {topCastNames}
              </Text>
            ) : null}
          </View>
        ) : null}

        {movie.genres && movie.genres.length > 0 && (
          <View style={styles.genres}>
            {movie.genres.map((genre) => (
              <View key={genre.id} style={styles.genre}>
                <Text style={styles.genreText}>{genre.name}</Text>
              </View>
            ))}
          </View>
        )}

        {trailer && isFocused && (
          <View
            style={styles.trailerSection}
            onLayout={(e) => setTrailerSectionY(e.nativeEvent.layout.y)}
          >
            <View style={styles.trailerHeader}>
              <View style={styles.sectionTitleGroup}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionTitle}>Official Trailer</Text>
              </View>

              <View style={styles.trailerActions}>
                <Pressable
                  style={styles.closeTrailerBtn}
                  onPress={openExternalYouTube}
                >
                  <Ionicons name="logo-youtube" size={14} color={NETFLIX_RED} />
                  <Text style={styles.closeTrailerText}>YouTube</Text>
                </Pressable>

                {showTrailer && !isLandscape && (
                  <Pressable
                    style={styles.closeTrailerBtn}
                    onPress={() => setShowTrailer(false)}
                  >
                    <Ionicons name="close" size={15} color={colors.text} />
                    <Text style={styles.closeTrailerText}>Close</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View
              style={[
                styles.playerWrapper,
                {
                  width: inlineWidth,
                  height: inlineHeight,
                  alignSelf: "center",
                },
              ]}
            >
              {playerFailed ? (
                <View style={styles.playerFallback}>
                  <Ionicons name="logo-youtube" size={36} color={NETFLIX_RED} />
                  <Text style={styles.fallbackText}>
                    This trailer cannot play embedded on this device.
                  </Text>
                  <Pressable
                    style={styles.youtubeExtBtn}
                    onPress={openExternalYouTube}
                  >
                    <Text style={styles.youtubeExtText}>Open in YouTube</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {!isFullscreen && (
                    <TrailerPlayer
                      key={trailer.key}
                      width={inlineWidth}
                      height={inlineHeight}
                      play={shouldPlayInline}
                      mute={!showTrailer}
                      videoId={trailer.key}
                      onReady={() => {
                        setPlayerReady(true);
                      }}
                      onPlaying={() => {
                        if (!showTrailer && !isPrebuffered) {
                          setIsPrebuffered(true);
                        }
                      }}
                      onFullScreenChange={(full) => {
                        if (full) {
                          setShowTrailer(true);
                          setIsFullscreen(true);
                        }
                      }}
                      onError={() => {
                        setPlayerFailed(true);
                        setShowTrailer(false);
                      }}
                      onEnded={() => {
                        setShowTrailer(false);
                      }}
                    />
                  )}

                  {(!showTrailer || isFullscreen) && (
                    <Pressable
                      style={styles.thumbnailOverlayCard}
                      onPress={handlePlayPress}
                    >
                      {thumbnailUrl ? (
                        <Image
                          source={{ uri: thumbnailUrl }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                      ) : null}

                      <View style={styles.thumbnailOverlay}>
                        <View style={styles.playCircle}>
                          <Ionicons
                            name="play"
                            size={28}
                            color="#FFFFFF"
                            style={{ marginLeft: 3 }}
                          />
                        </View>

                        <Text style={styles.thumbnailTitle} numberOfLines={1}>
                          {trailer.name || "Watch Official Trailer"}
                        </Text>

                        <Text style={styles.thumbnailSubtitle}>
                          {isLandscape
                            ? "Tap to watch in Full Screen"
                            : isPrebuffered || playerReady
                              ? "Ready · Tap to play"
                              : "Preparing trailer..."}
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {showTrailer && !isFullscreen && !playerReady && (
                    <View style={styles.bufferingOverlay}>
                      <ActivityIndicator color={NETFLIX_RED} size="large" />
                      <Text style={styles.bufferingText}>
                        Loading trailer...
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {movie.credits?.cast && movie.credits.cast.length > 0 && (
          <View style={styles.castSection}>
            <View style={styles.sectionTitleGroup}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionTitle}>Cast & Characters</Text>
            </View>

            <View
              style={[styles.castList, isLandscape && styles.castGridLandscape]}
            >
              {movie.credits.cast.slice(0, 10).map((actor) => (
                <View
                  key={actor.id}
                  style={[styles.castCard, isLandscape && { width: "48.8%" }]}
                >
                  <View style={styles.castAvatar}>
                    <Text style={styles.castAvatarText}>
                      {(actor.name || "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actorName} numberOfLines={1}>
                      {actor.name}
                    </Text>
                    {actor.character ? (
                      <Text style={styles.actorRole} numberOfLines={1}>
                        {actor.character}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {trailer && (
        <Modal
          visible={isFullscreen}
          animationType="fade"
          supportedOrientations={["portrait", "landscape"]}
          statusBarTranslucent
          onRequestClose={handleExitFullscreen}
        >
          <StatusBar hidden />
          <View style={styles.fullscreenModal}>
            <View
              style={{
                width: fsContainerWidth,
                height: fsContainerHeight,
                justifyContent: "center",
                alignItems: "center",
                transform: [{ rotate: isLandscape ? "0deg" : "90deg" }],
              }}
            >
              <Pressable
                style={styles.exitFullscreenBtn}
                onPress={handleExitFullscreen}
              >
                <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
                <Text style={styles.exitFullscreenText}>Back</Text>
              </Pressable>

              <TrailerPlayer
                key={`fullscreen_${trailer.key}_${fullscreenWidth}_${fullscreenHeight}`}
                width={fullscreenWidth}
                height={fullscreenHeight}
                play={isFullscreen}
                mute={false}
                videoId={trailer.key}
                onFullScreenChange={(full) => {
                  if (!full) {
                    handleExitFullscreen();
                  }
                }}
                onError={() => {
                  handleExitFullscreen();
                  setPlayerFailed(true);
                }}
                onEnded={handleExitFullscreen}
              />
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
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
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      gap: 12,
    },
    backdropWrapper: {
      position: "relative",
    },
    backdrop: {
      width: "100%",
      height: 255,
      backgroundColor: colors.surface,
    },
    backdropGradient: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    backFab: {
      position: "absolute",
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(11, 11, 19, 0.76)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      justifyContent: "center",
      alignItems: "center",
    },
    reviewTopFab: {
      position: "absolute",
      height: 36,
      paddingHorizontal: 13,
      borderRadius: 18,
      backgroundColor: "rgba(11, 11, 19, 0.76)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    reviewTopFabText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },
    content: {
      paddingTop: 10,
    },
    topHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 14,
      marginTop: -76,
    },
    posterFrame: {
      position: "relative",
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: colors.background,
      backgroundColor: colors.surface,
    },
    poster: {
      width: 112,
      height: 168,
    },
    miniBrandTag: {
      position: "absolute",
      top: 7,
      left: 7,
      width: 18,
      height: 18,
      borderRadius: 4,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "900",
    },
    headerMeta: {
      flex: 1,
      paddingBottom: 4,
    },
    filmTagRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: 4,
    },
    filmTagC: {
      color: NETFLIX_RED,
      fontSize: 13,
      fontWeight: "900",
    },
    filmTagText: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 2.4,
    },
    title: {
      color: colors.text,
      fontSize: 23,
      fontWeight: "900",
      letterSpacing: -0.3,
    },
    netflixMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 7,
      marginTop: 7,
    },
    matchText: {
      color: NETFLIX_GREEN,
      fontSize: 12,
      fontWeight: "800",
    },
    metaText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
    },
    hdPill: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 3,
    },
    hdPillText: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: "800",
    },
    starMetaText: {
      color: "#FBBF24",
      fontSize: 12,
      fontWeight: "800",
    },
    tagline: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 6,
      fontStyle: "italic",
    },
    actionsContainer: {
      gap: 10,
      marginTop: 18,
    },
    actionsContainerLandscape: {
      flexDirection: "row",
    },
    netflixPlayBtn: {
      height: 46,
      borderRadius: 8,
      backgroundColor: "#FFFFFF",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    netflixPlayText: {
      color: "#0B0B13",
      fontSize: 15,
      fontWeight: "900",
    },
    secondaryRow: {
      flexDirection: "row",
      gap: 10,
    },
    netflixSecondaryBtn: {
      flex: 1,
      height: 44,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    activeMyListBtn: {
      backgroundColor: `${NETFLIX_RED}22`,
      borderColor: NETFLIX_RED,
    },
    netflixSecondaryText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800",
    },
    overviewBlock: {
      marginTop: 18,
    },
    overview: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
      opacity: 0.9,
    },
    starringLine: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 8,
    },
    starringLabel: {
      color: colors.text,
      fontWeight: "800",
    },
    genres: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 14,
    },
    genre: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    genreText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
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
      fontSize: 17,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    trailerSection: {
      marginTop: 22,
    },
    trailerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    trailerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    closeTrailerBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    closeTrailerText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
    },
    playerWrapper: {
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: "#000000",
      borderWidth: 1,
      borderColor: colors.border,
      position: "relative",
    },
    thumbnailOverlayCard: {
      ...StyleSheet.absoluteFill,
      zIndex: 2,
      backgroundColor: "#0F0F17",
    },
    thumbnailOverlay: {
      flex: 1,
      backgroundColor: "rgba(9, 9, 16, 0.52)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    playCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
    },
    thumbnailTitle: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
      textAlign: "center",
    },
    thumbnailSubtitle: {
      color: "#D1D5DB",
      fontSize: 12,
      marginTop: 4,
    },
    bufferingOverlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 3,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
    },
    bufferingText: {
      color: "#D1D5DB",
      fontSize: 12,
      fontWeight: "600",
    },
    playerFallback: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
      gap: 10,
    },
    fallbackText: {
      color: "#D1D5DB",
      fontSize: 13,
      textAlign: "center",
    },
    youtubeExtBtn: {
      backgroundColor: NETFLIX_RED,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
    },
    youtubeExtText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
    fullscreenModal: {
      flex: 1,
      backgroundColor: "#000000",
      justifyContent: "center",
      alignItems: "center",
    },
    exitFullscreenBtn: {
      position: "absolute",
      top: 14,
      left: 16,
      zIndex: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(255, 255, 255, 0.16)",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    exitFullscreenText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },
    castSection: {
      marginTop: 24,
    },
    castList: {
      marginTop: 12,
      gap: 8,
    },
    castGridLandscape: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    castCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    castAvatar: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: `${NETFLIX_RED}20`,
      borderWidth: 1,
      borderColor: `${NETFLIX_RED}45`,
      justifyContent: "center",
      alignItems: "center",
    },
    castAvatarText: {
      color: NETFLIX_RED,
      fontSize: 14,
      fontWeight: "900",
    },
    actorName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
    },
    actorRole: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 1,
    },
    error: {
      color: NETFLIX_RED,
      fontSize: 15,
      textAlign: "center",
    },
    retryBtn: {
      backgroundColor: NETFLIX_RED,
      paddingHorizontal: 22,
      paddingVertical: 11,
      borderRadius: 10,
    },
    retryText: {
      color: "#FFFFFF",
      fontWeight: "800",
    },
  });
