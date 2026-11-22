import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Review } from "../../types/review";
import { getReviews, saveReviews } from "../../services/reviewStorage";
import { getMovieDetails, IMAGE_URL } from "../../services/tmdb";
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

export default function EditReviewScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const { id, movieId: paramMovieId } = useLocalSearchParams<{
    id: string;
    movieId?: string;
  }>();

  const [resolvedMovieId, setResolvedMovieId] = useState<string | null>(
    paramMovieId ?? null,
  );
  const [targetReview, setTargetReview] = useState<Review | null>(null);
  const [movieMeta, setMovieMeta] = useState<{
    title: string;
    poster: string | null;
    year: string;
  } | null>(null);

  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTargetReview = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        if (paramMovieId) {
          const list = await getReviews(paramMovieId);
          const found = list.find((item) => String(item.id) === String(id));
          if (found) {
            setResolvedMovieId(paramMovieId);
            setTargetReview(found);
            setContent(found.content);
            setRating(found.rating);
            return;
          }
        }

        const allKeys = await AsyncStorage.getAllKeys();
        const candidateKeys = allKeys.filter(
          (k) =>
            k.toLowerCase().includes("review") &&
            !k.toLowerCase().includes("user"),
        );

        for (const key of candidateKeys) {
          const raw = await AsyncStorage.getItem(key);
          if (!raw) continue;

          try {
            const parsed = JSON.parse(raw);

            if (Array.isArray(parsed)) {
              const found = parsed.find(
                (item: Review) => item && String(item.id) === String(id),
              );
              if (found) {
                const mId = String(found.movieId || key.replace(/\D/g, ""));
                setResolvedMovieId(mId || null);
                setTargetReview(found);
                setContent(found.content ?? "");
                setRating(found.rating ?? 5);
                return;
              }
            } else if (parsed && typeof parsed === "object") {
              for (const [mId, list] of Object.entries(parsed)) {
                if (Array.isArray(list)) {
                  const found = list.find(
                    (item: Review) => item && String(item.id) === String(id),
                  );
                  if (found) {
                    setResolvedMovieId(mId);
                    setTargetReview(found);
                    setContent(found.content ?? "");
                    setRating(found.rating ?? 5);
                    return;
                  }
                }
              }
            }
          } catch {}
        }
      } catch {
        Alert.alert("Error", "Could not load review.");
      } finally {
        setLoading(false);
      }
    };

    loadTargetReview();
  }, [id, paramMovieId]);

  useEffect(() => {
    const mId = resolvedMovieId || targetReview?.movieId;
    if (!mId) return;

    let active = true;
    (async () => {
      try {
        const details = await getMovieDetails(Number(mId));
        if (active && details) {
          setMovieMeta({
            title: details.title,
            poster: details.poster_path,
            year: details.release_date ? details.release_date.slice(0, 4) : "",
          });
        }
      } catch {}
    })();

    return () => {
      active = false;
    };
  }, [resolvedMovieId, targetReview?.movieId]);

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert("Validation", "Please write your review.");
      return;
    }

    if (rating < 1 || rating > 5) {
      Alert.alert("Validation", "Please select a rating between 1 and 5.");
      return;
    }

    const mId = resolvedMovieId || targetReview?.movieId;
    if (!mId) {
      Alert.alert("Error", "Movie reference was not found for this review.");
      return;
    }

    try {
      setSaving(true);

      const currentList = await getReviews(String(mId));
      const updatedList = currentList.map((item) =>
        String(item.id) === String(id)
          ? {
              ...item,
              content: content.trim(),
              rating,
            }
          : item,
      );

      await saveReviews(String(mId), updatedList);
      router.back();
    } catch {
      Alert.alert("Error", "Could not update your review.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    const mId = resolvedMovieId || targetReview?.movieId;
    if (!mId) return;

    Alert.alert(
      "Delete Review",
      "Are you sure you want to delete this review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              const currentList = await getReviews(String(mId));
              const filtered = currentList.filter(
                (item) => String(item.id) !== String(id),
              );
              await saveReviews(String(mId), filtered);
              router.back();
            } catch {
              Alert.alert("Error", "Could not delete review.");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={NETFLIX_RED} size="large" />
      </View>
    );
  }

  const ratingInfo = RATING_LABELS[rating] || RATING_LABELS[5];

  const renderMovieAndRatingCard = () => (
    <View style={[styles.card, isLandscape && { padding: 14 }]}>
      {movieMeta && (
        <View style={styles.movieBanner}>
          <View style={styles.posterWrap}>
            {movieMeta.poster ? (
              <Image
                source={{ uri: `${IMAGE_URL}w185${movieMeta.poster}` }}
                style={styles.poster}
              />
            ) : (
              <View style={styles.posterFallback}>
                <Ionicons name="film-outline" size={20} color={colors.muted} />
              </View>
            )}
            <View style={styles.miniBrandTag}>
              <Text style={styles.miniBrandText}>C</Text>
            </View>
          </View>

          <View style={styles.movieBannerInfo}>
            <Text style={styles.movieBannerTitle} numberOfLines={2}>
              {movieMeta.title}
            </Text>
            <View style={styles.movieBannerMetaRow}>
              <Text style={styles.matchText}>{ratingInfo.match}</Text>
              {movieMeta.year ? (
                <Text style={styles.yearText}>· {movieMeta.year}</Text>
              ) : null}
            </View>
          </View>
        </View>
      )}

      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccentBar} />
        <Text style={styles.label}>Your Rating</Text>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingBadgeText}>{ratingInfo.label}</Text>
        </View>
      </View>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= rating;
          return (
            <Pressable
              key={star}
              style={[
                styles.starPill,
                isLandscape && { height: 42 },
                active && styles.starPillActive,
              ]}
              onPress={() => setRating(star)}
            >
              <Ionicons
                name={active ? "star" : "star-outline"}
                size={isLandscape ? 19 : 22}
                color={active ? "#FBBF24" : colors.muted}
              />
              <Text style={[styles.starNum, active && styles.starNumActive]}>
                {star}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderEditorCard = () => (
    <View style={[styles.card, isLandscape && { padding: 14, flex: 1 }]}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccentBar} />
        <Text style={styles.label}>Your Thoughts</Text>
        <Text style={styles.counter}>{content.length}/500</Text>
      </View>

      <TextInput
        style={[styles.input, isLandscape && { minHeight: 96 }]}
        placeholder="Share what stood out — story, acting, soundtrack..."
        placeholderTextColor={colors.muted}
        value={content}
        onChangeText={setContent}
        multiline
        textAlignVertical="top"
        maxLength={500}
        disableFullscreenUI={true}
      />

      <View style={[styles.actionsRow, isLandscape && { marginTop: 12 }]}>
        <Pressable
          style={[styles.cancelButton, isLandscape && { height: 42 }]}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[
            styles.submitButton,
            isLandscape && { height: 42 },
            saving && styles.disabledButton,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.submitText}>Save Changes</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 8, isLandscape ? 14 : 44),
            paddingLeft: Math.max(insets.left + 12, isLandscape ? 20 : 16),
            paddingRight: Math.max(insets.right + 12, isLandscape ? 20 : 16),
            paddingBottom: Math.max(insets.bottom + 20, 36),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.topBar, isLandscape && { marginBottom: 12 }]}>
          <Pressable
            style={[
              styles.iconButton,
              isLandscape && { width: 38, height: 38, borderRadius: 10 },
            ]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={19} color={colors.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <View style={styles.criticBadge}>
              <Text style={styles.criticBadgeText}>CRITIC REVIEW</Text>
            </View>
            <Text style={[styles.headerTitle, isLandscape && { fontSize: 18 }]}>
              Edit Review
            </Text>
          </View>

          <Pressable
            style={[
              styles.iconButton,
              styles.deleteIconBtn,
              isLandscape && { width: 38, height: 38, borderRadius: 10 },
            ]}
            onPress={handleDelete}
            disabled={saving}
          >
            <Ionicons name="trash-outline" size={19} color={NETFLIX_RED} />
          </Pressable>
        </View>

        {isLandscape ? (
          <View style={styles.landscapeGrid}>
            <View style={styles.landscapeLeft}>
              {renderMovieAndRatingCard()}
            </View>
            <View style={styles.landscapeRight}>{renderEditorCard()}</View>
          </View>
        ) : (
          <View style={styles.portraitStack}>
            {renderMovieAndRatingCard()}
            {renderEditorCard()}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    },
    scrollContent: {
      flexGrow: 1,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    deleteIconBtn: {
      backgroundColor: `${NETFLIX_RED}14`,
      borderColor: `${NETFLIX_RED}40`,
    },
    headerCenter: {
      alignItems: "center",
      gap: 3,
    },
    criticBadge: {
      backgroundColor: NETFLIX_RED,
      paddingHorizontal: 7,
      paddingVertical: 1.5,
      borderRadius: 4,
    },
    criticBadgeText: {
      color: "#FFFFFF",
      fontSize: 8.5,
      fontWeight: "900",
      letterSpacing: 1.1,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
      letterSpacing: -0.2,
    },
    portraitStack: {
      gap: 14,
    },
    landscapeGrid: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 14,
    },
    landscapeLeft: {
      width: "44%",
    },
    landscapeRight: {
      flex: 1,
    },
    card: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    movieBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingBottom: 14,
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    posterWrap: {
      position: "relative",
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    poster: {
      width: 46,
      height: 68,
    },
    posterFallback: {
      width: 46,
      height: 68,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandTag: {
      position: "absolute",
      top: 4,
      left: 4,
      width: 14,
      height: 14,
      borderRadius: 3,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    miniBrandText: {
      color: "#FFFFFF",
      fontSize: 8,
      fontWeight: "900",
    },
    movieBannerInfo: {
      flex: 1,
    },
    movieBannerTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "900",
    },
    movieBannerMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    matchText: {
      color: NETFLIX_GREEN,
      fontSize: 12,
      fontWeight: "800",
    },
    yearText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600",
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 11,
    },
    sectionAccentBar: {
      width: 3.5,
      height: 15,
      borderRadius: 2,
      backgroundColor: NETFLIX_RED,
    },
    label: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    ratingBadge: {
      backgroundColor: "rgba(251, 191, 36, 0.15)",
      borderWidth: 1,
      borderColor: "rgba(251, 191, 36, 0.35)",
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 6,
    },
    ratingBadgeText: {
      color: "#FBBF24",
      fontSize: 11,
      fontWeight: "800",
    },
    starsRow: {
      flexDirection: "row",
      gap: 8,
    },
    starPill: {
      flex: 1,
      height: 50,
      borderRadius: 11,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
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
    counter: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
    },
    input: {
      minHeight: 130,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      color: colors.text,
      textAlignVertical: "top",
      fontSize: 14,
      lineHeight: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
    },
    cancelButton: {
      flex: 1,
      height: 48,
      borderRadius: 11,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    cancelText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    submitButton: {
      flex: 1.5,
      height: 48,
      borderRadius: 11,
      backgroundColor: NETFLIX_RED,
      flexDirection: "row",
      gap: 6,
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
  });
