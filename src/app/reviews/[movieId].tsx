import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../services/firebase";
import { Review } from "../../types/review";
import { getReviews, saveReviews } from "../../services/reviewStorage";
import {
  getCachedMovieBasic,
  getMovieDetails,
  IMAGE_URL,
} from "../../services/tmdb";
import { useAppTheme } from "../../hooks/useAppTheme";
import type { ThemeColors } from "../../context/ThemeContext";

const NETFLIX_RED = "#E50914";
const NETFLIX_GREEN = "#46D369";

const RATING_LABELS: Record<number, { label: string; match: string }> = {
  1: { label: "Not For Me", match: "20% Match" },
  2: { label: "Below Average", match: "40% Match" },
  3: { label: "Worth a Watch", match: "65% Match" },
  4: { label: "Great Cinema", match: "85% Match" },
  5: { label: "Masterpiece", match: "99% Match" },
};

export default function ReviewsScreen() {
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
  const topPadding = isLandscape
    ? Math.max(insets.top + 8, 14)
    : Math.max(insets.top + 10, 42);
  const bottomPadding = Math.max(insets.bottom + 16, 32);

  const numColumns = isLandscape ? 2 : 1;
  const gridGap = 12;
  const cardWidth = useMemo(() => {
    if (!isLandscape) return undefined;
    return (width - sidePadding * 2 - gridGap) / 2;
  }, [isLandscape, width, sidePadding]);

  const { movieId } = useLocalSearchParams<{
    movieId: string;
  }>();

  const numericMovieId = Number(movieId);
  const initialBasicMovie = useMemo(
    () =>
      !Number.isNaN(numericMovieId) && numericMovieId > 0
        ? getCachedMovieBasic(numericMovieId)
        : null,
    [numericMovieId],
  );

  const [movieMeta, setMovieMeta] = useState<{
    title: string;
    poster: string | null;
    year: string;
    voteAverage: number;
  } | null>(
    initialBasicMovie
      ? {
          title: initialBasicMovie.title,
          poster: initialBasicMovie.poster_path,
          year: initialBasicMovie.release_date
            ? initialBasicMovie.release_date.slice(0, 4)
            : "",
          voteAverage: initialBasicMovie.vote_average ?? 0,
        }
      : null,
  );

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);

  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeUidRef = useRef<string | null>(auth.currentUser?.uid ?? null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      activeUidRef.current = user?.uid ?? null;
      setCurrentUser(user);
      setAuthReady(true);

      setEditingId(null);
      setContent("");
      setRating(5);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (Number.isNaN(numericMovieId) || numericMovieId <= 0) return;

    let active = true;
    (async () => {
      try {
        const details = await getMovieDetails(numericMovieId);
        if (active && details) {
          setMovieMeta({
            title: details.title,
            poster: details.poster_path,
            year: details.release_date ? details.release_date.slice(0, 4) : "",
            voteAverage: details.vote_average ?? 0,
          });
        }
      } catch {}
    })();

    return () => {
      active = false;
    };
  }, [numericMovieId]);

  const currentUid = currentUser?.uid ?? null;
  const currentUserName = useMemo(() => {
    if (!currentUser) return "Guest";
    if (currentUser.displayName?.trim()) return currentUser.displayName.trim();
    if (currentUser.email) return currentUser.email.split("@")[0];
    return "Member";
  }, [currentUser]);

  const myReviews = useMemo(() => {
    if (!currentUid) return [];
    return allReviews.filter((review) => review.userId === currentUid);
  }, [allReviews, currentUid]);

  const loadReviews = useCallback(async () => {
    if (!movieId || !authReady) return;

    if (!currentUid) {
      setAllReviews([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getReviews(movieId);

      if (activeUidRef.current !== currentUid) {
        return;
      }

      setAllReviews(data);
    } catch {
      setError("Could not load reviews.");
    } finally {
      if (activeUidRef.current === currentUid) {
        setLoading(false);
      }
    }
  }, [movieId, authReady, currentUid]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (movieId) {
      router.replace(`/movie/${movieId}`);
    } else {
      router.replace("/");
    }
  };

  const handleSubmit = async () => {
    if (!movieId) return;

    if (!currentUid) {
      Alert.alert("Account Required", "Please sign in to write a review.");
      return;
    }

    if (!content.trim()) {
      Alert.alert("Validation", "Please write your review.");
      return;
    }

    if (rating < 1 || rating > 5) {
      Alert.alert("Validation", "Please select a rating.");
      return;
    }

    try {
      setSaving(true);

      const latestAllReviews = await getReviews(movieId);
      let updatedReviews: Review[];

      if (editingId) {
        updatedReviews = latestAllReviews.map((review) =>
          review.id === editingId && review.userId === currentUid
            ? {
                ...review,
                content: content.trim(),
                rating,
              }
            : review,
        );
      } else {
        const newReview: Review = {
          id: Date.now().toString(),
          movieId,
          userId: currentUid,
          userName: currentUserName,
          content: content.trim(),
          rating,
          createdAt: new Date().toISOString(),
        };

        updatedReviews = [newReview, ...latestAllReviews];
      }

      await saveReviews(movieId, updatedReviews);

      setAllReviews(updatedReviews);
      setContent("");
      setRating(5);
      setEditingId(null);
    } catch {
      Alert.alert("Error", "Could not save your review.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (review: Review) => {
    if (review.userId !== currentUid) return;
    setEditingId(review.id);
    setContent(review.content);
    setRating(review.rating);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setContent("");
    setRating(5);
  };

  const handleDelete = (id: string) => {
    if (!movieId || !currentUid) return;

    Alert.alert(
      "Delete Review",
      "Are you sure you want to delete this review?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const latestAllReviews = await getReviews(movieId);
              const updatedReviews = latestAllReviews.filter(
                (review) => !(review.id === id && review.userId === currentUid),
              );

              await saveReviews(movieId, updatedReviews);

              setAllReviews(updatedReviews);

              if (editingId === id) {
                cancelEdit();
              }
            } catch {
              Alert.alert("Error", "Could not delete review.");
            }
          },
        },
      ],
    );
  };

  const ratingInfo = RATING_LABELS[rating] || RATING_LABELS[5];
  const movieMatchScore = movieMeta
    ? Math.round(movieMeta.voteAverage * 10)
    : 0;

  const renderReview = ({ item }: { item: Review }) => {
    const isBeingEdited = editingId === item.id;
    const itemRatingInfo = RATING_LABELS[item.rating] || RATING_LABELS[5];

    return (
      <View
        style={[
          styles.reviewCard,
          isBeingEdited && styles.reviewCardEditing,
          cardWidth
            ? { width: cardWidth, marginBottom: gridGap }
            : { marginBottom: 12 },
        ]}
      >
        <View style={styles.reviewHeader}>
          <View style={styles.authorGroup}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorAvatarText}>
                {(item.userName || "M").charAt(0).toUpperCase()}
              </Text>
            </View>

            <View>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {item.userName}
                </Text>
                <View style={styles.memberBadge}>
                  <Text style={styles.memberBadgeText}>YOU</Text>
                </View>
              </View>

              <View style={styles.cardStarsRow}>
                <Text style={styles.reviewRating}>
                  {"★".repeat(item.rating)}
                  {"☆".repeat(5 - item.rating)}
                </Text>
                <Text style={styles.cardMatchText}>{itemRatingInfo.match}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.reviewContent}>{item.content}</Text>

        <View style={styles.actions}>
          <Pressable style={styles.editButton} onPress={() => handleEdit(item)}>
            <Ionicons name="create-outline" size={14} color={colors.text} />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>

          <Pressable
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={14} color={NETFLIX_RED} />
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        key={`reviews_grid_${numColumns}`}
        data={myReviews}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { gap: gridGap } : undefined}
        renderItem={renderReview}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: sidePadding,
            paddingTop: topPadding,
            paddingBottom: bottomPadding,
          },
        ]}
        ListHeaderComponent={
          <View>
            <View
              style={[styles.topBar, isLandscape && styles.topBarLandscape]}
            >
              <Pressable
                style={[
                  styles.backButton,
                  isLandscape && { width: 38, height: 38, borderRadius: 10 },
                ]}
                onPress={handleBack}
              >
                <Ionicons name="arrow-back" size={19} color={colors.text} />
              </Pressable>

              <View style={styles.headerTitleWrap}>
                <View style={styles.criticBadge}>
                  <Text style={styles.criticBadgeText}>CRITIC REVIEWS</Text>
                </View>
                <Text style={[styles.title, isLandscape && { fontSize: 20 }]}>
                  Rate & Review
                </Text>
              </View>

              <View style={styles.countPill}>
                <Text style={styles.countPillText}>
                  {myReviews.length}{" "}
                  {myReviews.length === 1 ? "Review" : "Reviews"}
                </Text>
              </View>
            </View>

            {movieMeta && (
              <View
                style={[
                  styles.movieContextCard,
                  isLandscape && { padding: 9, marginBottom: 12 },
                ]}
              >
                <View style={styles.posterWrap}>
                  {movieMeta.poster ? (
                    <Image
                      source={{ uri: `${IMAGE_URL}w185${movieMeta.poster}` }}
                      style={[
                        styles.contextPoster,
                        isLandscape && { width: 36, height: 52 },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.contextPosterFallback,
                        isLandscape && { width: 36, height: 52 },
                      ]}
                    >
                      <Ionicons
                        name="film-outline"
                        size={18}
                        color={colors.muted}
                      />
                    </View>
                  )}
                  <View style={styles.miniBrandTag}>
                    <Text style={styles.miniBrandText}>C</Text>
                  </View>
                </View>

                <View style={styles.contextInfo}>
                  <Text style={styles.contextTitle} numberOfLines={1}>
                    {movieMeta.title}
                  </Text>
                  <View style={styles.contextMetaRow}>
                    {movieMatchScore >= 50 && (
                      <Text style={styles.contextMatch}>
                        {movieMatchScore}% Match
                      </Text>
                    )}
                    {movieMeta.year ? (
                      <Text style={styles.contextYear}>{movieMeta.year}</Text>
                    ) : null}
                    <View style={styles.hdBadge}>
                      <Text style={styles.hdBadgeText}>HD</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <View
              style={[
                styles.form,
                isLandscape && { padding: 14, marginBottom: 18 },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccentBar} />
                <Text
                  style={[styles.formTitle, isLandscape && { fontSize: 15 }]}
                >
                  {editingId ? "Edit Your Review" : "Write a Review"}
                </Text>

                <View style={styles.ratingLabelBadge}>
                  <Text style={styles.ratingLabelBadgeText}>
                    {ratingInfo.label}
                  </Text>
                </View>
              </View>

              <View
                style={[styles.starsRow, isLandscape && { marginBottom: 10 }]}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= rating;
                  return (
                    <Pressable
                      key={star}
                      style={[
                        styles.starPill,
                        isLandscape && { height: 40 },
                        active && styles.starPillActive,
                      ]}
                      onPress={() => setRating(star)}
                    >
                      <Ionicons
                        name={active ? "star" : "star-outline"}
                        size={isLandscape ? 17 : 20}
                        color={active ? "#FBBF24" : colors.muted}
                      />
                      <Text
                        style={[styles.starNum, active && styles.starNumActive]}
                      >
                        {star}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={[styles.input, isLandscape && { minHeight: 76 }]}
                placeholder="Share your thoughts — story, acting, soundtrack..."
                placeholderTextColor={colors.muted}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
                maxLength={500}
                disableFullscreenUI={true}
              />

              <Text style={styles.counter}>{content.length}/500</Text>

              <View
                style={[
                  styles.formActionsRow,
                  isLandscape && { marginTop: 10 },
                ]}
              >
                {editingId && (
                  <Pressable
                    style={[styles.cancelButton, isLandscape && { height: 42 }]}
                    onPress={cancelEdit}
                    disabled={saving}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                )}

                <Pressable
                  style={[
                    styles.submitButton,
                    isLandscape && { height: 42 },
                    saving && styles.disabledButton,
                  ]}
                  onPress={handleSubmit}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name={editingId ? "checkmark" : "send"}
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.submitText}>
                        {editingId ? "Update Review" : "Post Review"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            <View
              style={[
                styles.listHeaderRow,
                isLandscape && { marginBottom: 10 },
              ]}
            >
              <View style={styles.sectionAccentBar} />
              <Text style={[styles.listTitle, isLandscape && { fontSize: 16 }]}>
                Your Reviews ({myReviews.length})
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={32}
                color={NETFLIX_RED}
              />
              <Text style={styles.emptyTitle}>No Reviews Yet</Text>
              <Text style={styles.empty}>
                Rate this title above and share your honest take.
              </Text>
            </View>
          ) : undefined
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator
              color={NETFLIX_RED}
              size="large"
              style={styles.loader}
            />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : undefined
        }
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    list: {
      flexGrow: 1,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
    },
    topBarLandscape: {
      marginBottom: 10,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitleWrap: {
      flex: 1,
    },
    criticBadge: {
      alignSelf: "flex-start",
      backgroundColor: NETFLIX_RED,
      paddingHorizontal: 7,
      paddingVertical: 1.5,
      borderRadius: 4,
      marginBottom: 3,
    },
    criticBadgeText: {
      color: "#FFFFFF",
      fontSize: 8.5,
      fontWeight: "900",
      letterSpacing: 1.1,
    },
    title: {
      color: colors.text,
      fontSize: 23,
      fontWeight: "900",
      letterSpacing: -0.3,
    },
    countPill: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    countPillText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "800",
    },

    movieContextCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      backgroundColor: colors.surface,
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    posterWrap: {
      position: "relative",
      borderRadius: 7,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    contextPoster: {
      width: 42,
      height: 62,
    },
    contextPosterFallback: {
      width: 42,
      height: 62,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandTag: {
      position: "absolute",
      top: 3,
      left: 3,
      width: 13,
      height: 13,
      borderRadius: 3,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandText: {
      color: "#FFFFFF",
      fontSize: 7.5,
      fontWeight: "900",
    },
    contextInfo: {
      flex: 1,
    },
    contextTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "900",
    },
    contextMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 4,
    },
    contextMatch: {
      color: NETFLIX_GREEN,
      fontSize: 11,
      fontWeight: "800",
    },
    contextYear: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
    },
    hdBadge: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 5,
      paddingVertical: 0.5,
      borderRadius: 3,
    },
    hdBadgeText: {
      color: colors.muted,
      fontSize: 8.5,
      fontWeight: "800",
    },

    form: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 16,
      marginBottom: 22,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    sectionAccentBar: {
      width: 3.5,
      height: 15,
      borderRadius: 2,
      backgroundColor: NETFLIX_RED,
    },
    formTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
    },
    ratingLabelBadge: {
      backgroundColor: "rgba(251, 191, 36, 0.15)",
      borderWidth: 1,
      borderColor: "rgba(251, 191, 36, 0.35)",
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 6,
    },
    ratingLabelBadgeText: {
      color: "#FBBF24",
      fontSize: 11,
      fontWeight: "800",
    },
    starsRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 14,
    },
    starPill: {
      flex: 1,
      height: 46,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
    },
    starPillActive: {
      backgroundColor: "rgba(251, 191, 36, 0.14)",
      borderColor: "#FBBF24",
    },
    starNum: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "800",
    },
    starNumActive: {
      color: "#FBBF24",
    },
    input: {
      minHeight: 104,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 13,
      color: colors.text,
      textAlignVertical: "top",
      fontSize: 14,
      lineHeight: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    counter: {
      color: colors.muted,
      textAlign: "right",
      fontSize: 11,
      fontWeight: "700",
      marginTop: 5,
    },
    formActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 12,
    },
    submitButton: {
      flex: 1.5,
      backgroundColor: NETFLIX_RED,
      height: 46,
      borderRadius: 10,
      flexDirection: "row",
      gap: 7,
      justifyContent: "center",
      alignItems: "center",
    },
    disabledButton: {
      opacity: 0.6,
    },
    submitText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 14,
    },
    cancelButton: {
      flex: 1,
      height: 46,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 14,
    },

    listHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    listTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    reviewCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "space-between",
    },
    reviewCardEditing: {
      borderColor: NETFLIX_RED,
      backgroundColor: `${NETFLIX_RED}0D`,
    },
    reviewHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 8,
    },
    authorGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    authorAvatar: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    authorAvatarText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "900",
    },
    authorNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    authorName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
    },
    memberBadge: {
      backgroundColor: `${NETFLIX_RED}20`,
      borderWidth: 1,
      borderColor: `${NETFLIX_RED}50`,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    memberBadgeText: {
      color: NETFLIX_RED,
      fontSize: 8.5,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    cardStarsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 2,
    },
    reviewRating: {
      color: "#FBBF24",
      fontSize: 13,
      letterSpacing: 1,
    },
    cardMatchText: {
      color: NETFLIX_GREEN,
      fontSize: 11,
      fontWeight: "800",
    },
    date: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "600",
    },
    reviewContent: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 11,
      opacity: 0.92,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    editButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 8,
    },
    editText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: `${NETFLIX_RED}16`,
      borderWidth: 1,
      borderColor: `${NETFLIX_RED}40`,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 8,
    },
    deleteText: {
      color: NETFLIX_RED,
      fontSize: 12,
      fontWeight: "700",
    },
    emptyCard: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 28,
      paddingHorizontal: 20,
      gap: 6,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
      marginTop: 4,
    },
    empty: {
      color: colors.muted,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
    },
    loader: {
      marginTop: 26,
    },
    error: {
      color: NETFLIX_RED,
      textAlign: "center",
      marginTop: 20,
      fontWeight: "700",
    },
  });
