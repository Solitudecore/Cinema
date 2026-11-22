import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signOut, updateProfile } from "firebase/auth";
import { auth } from "../../../services/firebase";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useWatchlist } from "../../../hooks/useWatchlist";
import { getMovieDetails, IMAGE_URL } from "../../../services/tmdb";
import {
  getUserProfile,
  saveUserProfile,
} from "../../../services/profileStorage";
import { getAllReviews } from "../../../services/reviewStorage";
import { UserProfile } from "../../../types/profile";
import { Review } from "../../../types/review";
import type { ThemeColors } from "../../../context/ThemeContext";

const NETFLIX_RED = "#E50914";

export default function ProfileScreen() {
  const { colors, theme, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const { items, isLoading } = useWatchlist();

  const [profile, setProfile] = useState<UserProfile>({
    name: "Movie Lover",
    email: "",
    avatarUri: null,
  });
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [fetchedMovies, setFetchedMovies] = useState<
    Record<string, { title: string; poster: string | null }>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const [profileData, reviewData] = await Promise.all([
        getUserProfile(),
        getAllReviews(),
      ]);

      const firebaseUser = auth.currentUser;
      const currentUid = firebaseUser?.uid ?? null;

      const mergedProfile: UserProfile = {
        name: profileData.name || firebaseUser?.displayName || "Movie Lover",
        email: profileData.email || firebaseUser?.email || "",
        avatarUri: profileData.avatarUri,
      };

      const userReviews = currentUid
        ? reviewData.filter((review) => review.userId === currentUid)
        : [];

      const sortedReviews = [...userReviews].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setProfile(mergedProfile);
      setDraftName(mergedProfile.name);
      setDraftEmail(mergedProfile.email);
      setReviews(sortedReviews);

      const uniqueMovieIds = Array.from(
        new Set(sortedReviews.slice(0, 5).map((r) => String(r.movieId)))
      );

      if (uniqueMovieIds.length > 0) {
        const results = await Promise.all(
          uniqueMovieIds.map(async (mId) => {
            try {
              const details = await getMovieDetails(Number(mId));
              return {
                id: mId,
                title: details.title,
                poster: details.poster_path,
              };
            } catch {
              return null;
            }
          })
        );

        const extraMap: Record<
          string,
          { title: string; poster: string | null }
        > = {};
        results.forEach((res) => {
          if (res) {
            extraMap[res.id] = { title: res.title, poster: res.poster };
          }
        });
        setFetchedMovies((prev) => ({ ...prev, ...extraMap }));
      }
    } catch {
      Alert.alert("Error", "Could not load profile information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const watchedMovies = useMemo(
    () => items.filter((item) => item.status === "watched"),
    [items]
  );

  const plannedMovies = useMemo(
    () => items.filter((item) => item.status === "plan_to_watch"),
    [items]
  );

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return "0.0";
    const sum = reviews.reduce(
      (total, review) => total + Number(review.rating || 0),
      0
    );
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const movieMap = useMemo(() => {
    const map: Record<string, { title: string; poster: string | null }> = {
      ...fetchedMovies,
    };
    items.forEach((item) => {
      map[String(item.movie.id)] = {
        title: item.movie.title,
        poster: item.movie.poster_path,
      };
    });
    return map;
  }, [items, fetchedMovies]);

  const initials = useMemo(() => {
    const parts = (profile.name || "M L").trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("");
  }, [profile.name]);

  const handleOpenReviews = () => {
    if (reviews.length > 0) {
      router.push({
        pathname: "/reviews/[movieId]",
        params: { movieId: String(reviews[0].movieId) },
      });
    } else if (items.length > 0) {
      router.push({
        pathname: "/reviews/[movieId]",
        params: { movieId: String(items[0].movie.id) },
      });
    } else {
      router.push("/(drawer)/(tabs)/search");
    }
  };

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newUri = result.assets[0].uri;
        const updated = { ...profile, avatarUri: newUri };
        setProfile(updated);
        await saveUserProfile(updated);
      }
    } catch {
      Alert.alert("Error", "Could not select profile picture.");
    }
  };

  const handleSave = async () => {
    const cleanName = draftName.trim();
    const cleanEmail = draftEmail.trim();

    if (!cleanName) {
      Alert.alert("Validation", "Please enter your name.");
      return;
    }

    try {
      setSaving(true);

      const updatedProfile: UserProfile = {
        ...profile,
        name: cleanName,
        email: cleanEmail,
      };

      if (auth.currentUser && auth.currentUser.displayName !== cleanName) {
        try {
          await updateProfile(auth.currentUser, { displayName: cleanName });
        } catch {
     
        }
      }

      await saveUserProfile(updatedProfile);
      setProfile(updatedProfile);
      setIsEditing(false);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch {
      Alert.alert("Error", "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDraftName(profile.name);
    setDraftEmail(profile.email);
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch {
            
          }
          await AsyncStorage.removeItem("is_logged_in");
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  };

  if (loading || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={NETFLIX_RED} />
      </View>
    );
  }

  const renderEditForm = () =>
    isEditing ? (
      <View style={[styles.editCard, isLandscape && { padding: 12, gap: 8 }]}>
        <View style={styles.editHeaderRow}>
          <Text style={styles.editTitle}>Manage Profile</Text>
          <View style={styles.ultraHdBadge}>
            <Text style={styles.ultraHdText}>EDITING</Text>
          </View>
        </View>

        <View style={[styles.inputBox, isLandscape && { height: 40 }]}>
          <Ionicons name="person-outline" size={16} color={colors.muted} />
          <TextInput
            style={styles.input}
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Profile name"
            placeholderTextColor={colors.muted}
          />
        </View>

        <View style={[styles.inputBox, isLandscape && { height: 40 }]}>
          <Ionicons name="mail-outline" size={16} color={colors.muted} />
          <TextInput
            style={styles.input}
            value={draftEmail}
            onChangeText={setDraftEmail}
            placeholder="Email address"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.editActions}>
          <Pressable
            style={[styles.cancelBtn, isLandscape && { height: 36 }]}
            onPress={handleCancelEdit}
            disabled={saving}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[
              styles.saveBtn,
              isLandscape && { height: 36 },
              saving && styles.disabledBtn,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      </View>
    ) : null;

  const renderReviewsAndAccount = () => (
    <>
      <View style={[styles.sectionHeader, isLandscape && { marginBottom: 8 }]}>
        <View style={styles.sectionTitleGroup}>
          <View style={styles.sectionAccentBar} />
          <Text style={styles.sectionTitle}>My Reviews</Text>
        </View>

        <Pressable style={styles.writePillBtn} onPress={handleOpenReviews}>
          <Ionicons name="add" size={14} color="#0B0B13" />
          <Text style={styles.writePillText}>Write</Text>
        </Pressable>
      </View>

      {reviews.length > 0 ? (
        <View
          style={[
            styles.reviewsList,
            isLandscape && { gap: 8, marginBottom: 16 },
          ]}
        >
          {reviews.slice(0, 3).map((review) => {
            const movieInfo = movieMap[String(review.movieId)];
            return (
              <Pressable
                key={review.id}
                style={[
                  styles.reviewCard,
                  isLandscape && { padding: 9, borderRadius: 12 },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/edit-review/[id]",
                    params: { id: review.id, movieId: review.movieId },
                  })
                }
              >
                <View style={styles.reviewPosterWrap}>
                  {movieInfo?.poster ? (
                    <Image
                      source={{ uri: `${IMAGE_URL}w185${movieInfo.poster}` }}
                      style={[
                        styles.reviewPoster,
                        isLandscape && { width: 42, height: 60 },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.reviewPosterFallback,
                        isLandscape && { width: 42, height: 60 },
                      ]}
                    >
                      <Ionicons
                        name="film-outline"
                        size={16}
                        color={colors.muted}
                      />
                    </View>
                  )}

                  <View style={styles.miniBrandTag}>
                    <Text style={styles.miniBrandText}>C</Text>
                  </View>
                </View>

                <View style={styles.reviewBody}>
                  <View style={styles.reviewHeaderRow}>
                    <Text style={styles.reviewMovieName} numberOfLines={1}>
                      {movieInfo?.title || `Movie #${review.movieId}`}
                    </Text>
                    <View style={styles.starPill}>
                      <Ionicons name="star" size={10} color="#FBBF24" />
                      <Text style={styles.starPillText}>
                        {Number(review.rating || 0).toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={styles.reviewSnippet}
                    numberOfLines={isLandscape ? 1 : 2}
                  >
                    {review.content}
                  </Text>

                  <Text style={styles.reviewDate}>
                    Reviewed {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.muted}
                />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Pressable
          style={[
            styles.emptyBox,
            isLandscape && { padding: 12, marginBottom: 16 },
          ]}
          onPress={handleOpenReviews}
        >
          <View style={styles.emptyIconCircle}>
            <Ionicons name="star-outline" size={19} color={NETFLIX_RED} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptySub}>
              Rate movies you watched to build your critic profile
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      )}

      <View
        style={[
          styles.sectionTitleGroup,
          { marginBottom: isLandscape ? 8 : 12 },
        ]}
      >
        <View style={styles.sectionAccentBar} />
        <Text style={styles.sectionTitle}>Account & Settings</Text>
      </View>

      <View style={styles.menuGroup}>
        <Pressable
          style={[styles.menuItem, isLandscape && { paddingVertical: 11 }]}
          onPress={() => router.push("/(drawer)/watched")}
        >
          <View style={styles.menuIconWrap}>
            <Ionicons
              name="stats-chart-outline"
              size={17}
              color={NETFLIX_RED}
            />
          </View>
          <Text style={styles.menuLabel}>Watched Stats & Top Genre</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>

        <View style={styles.menuLine} />

        <Pressable
          style={[styles.menuItem, isLandscape && { paddingVertical: 11 }]}
          onPress={() => router.push("/(drawer)/settings")}
        >
          <View style={styles.menuIconWrap}>
            <Ionicons
              name="settings-outline"
              size={17}
              color={NETFLIX_RED}
            />
          </View>
          <Text style={styles.menuLabel}>Appearance & Preferences</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>

        <View style={styles.menuLine} />

        <Pressable
          style={[styles.menuItem, isLandscape && { paddingVertical: 11 }]}
          onPress={handleLogout}
        >
          <View
            style={[
              styles.menuIconWrap,
              { backgroundColor: `${NETFLIX_RED}18` },
            ]}
          >
            <Ionicons
              name="log-out-outline"
              size={17}
              color={NETFLIX_RED}
            />
          </View>
          <Text style={[styles.menuLabel, { color: NETFLIX_RED }]}>
            Sign Out
          </Text>
          <Ionicons name="chevron-forward" size={16} color={NETFLIX_RED} />
        </Pressable>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: isLandscape ? 10 : 14,
            paddingLeft: Math.max(insets.left + 12, isLandscape ? 20 : 14),
            paddingRight: Math.max(insets.right + 12, isLandscape ? 20 : 14),
            paddingBottom: Math.max(insets.bottom + 14, 28),
          },
        ]}
      >
        {isLandscape ? (
          <View style={styles.landscapeContainer}>
         
           <View style={styles.landscapeLeftCol}>
              <View style={styles.landscapeProfileCard}>
                <View style={styles.landscapeProfileTop}>
                  <Pressable
                    style={styles.netflixAvatarBoxSmall}
                    onPress={pickImage}
                  >
                    {profile.avatarUri ? (
                      <Image
                        source={{ uri: profile.avatarUri }}
                        style={styles.netflixAvatarImgSmall}
                      />
                    ) : (
                      <View style={styles.netflixAvatarFallbackSmall}>
                        <Text style={styles.netflixAvatarInitialsSmall}>
                          {initials || "CV"}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cameraBadgeSmall}>
                      <Ionicons name="camera" size={10} color="#FFFFFF" />
                    </View>
                  </Pressable>

                  <View style={styles.landscapeIdentityText}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.userNameSmall} numberOfLines={1}>
                        {profile.name || "Movie Lover"}
                      </Text>
                    </View>
                    <Text style={styles.userEmailSmall} numberOfLines={1}>
                      {profile.email || "CineVerse Member"}
                    </Text>
                    <View style={styles.ultraHdBadge}>
                      <Text style={styles.ultraHdText}>ULTRA HD</Text>
                    </View>
                  </View>

                  <View style={styles.landscapeCardActions}>
                    <Pressable
                      style={[
                        styles.iconPillSmall,
                        isEditing && styles.iconPillActive,
                      ]}
                      onPress={() => setIsEditing((prev) => !prev)}
                    >
                      <Ionicons
                        name={isEditing ? "close" : "pencil"}
                        size={14}
                        color={isEditing ? "#FFFFFF" : colors.text}
                      />
                    </Pressable>

                    <Pressable
                      style={styles.iconPillSmall}
                      onPress={toggleTheme}
                    >
                      <Ionicons
                        name={
                          theme === "dark" ? "sunny-outline" : "moon-outline"
                        }
                        size={15}
                        color={NETFLIX_RED}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.statsGridLandscape}>
                  <View style={styles.statsGridRow}>
                    <Pressable
                      style={styles.statBoxLandscape}
                      onPress={() => router.push("/(drawer)/watched")}
                    >
                      <Text style={styles.statValueSmall}>
                        {watchedMovies.length}
                      </Text>
                      <Text style={styles.statLabelSmall}>Watched</Text>
                    </Pressable>

                    <Pressable
                      style={styles.statBoxLandscape}
                      onPress={() =>
                        router.push("/(drawer)/(tabs)/watchlist")
                      }
                    >
                      <Text style={styles.statValueSmall}>
                        {plannedMovies.length}
                      </Text>
                      <Text style={styles.statLabelSmall}>My List</Text>
                    </Pressable>
                  </View>

                  <View style={styles.statsGridRow}>
                    <Pressable
                      style={styles.statBoxLandscape}
                      onPress={handleOpenReviews}
                    >
                      <Text style={styles.statValueSmall}>
                        {reviews.length}
                      </Text>
                      <Text style={styles.statLabelSmall}>Reviews</Text>
                    </Pressable>

                    <Pressable
                      style={styles.statBoxLandscape}
                      onPress={handleOpenReviews}
                    >
                      <View style={styles.ratingValueRow}>
                        <Ionicons name="star" size={13} color="#FBBF24" />
                        <Text style={styles.statValueSmall}>
                          {averageRating}
                        </Text>
                      </View>
                      <Text style={styles.statLabelSmall}>Avg Score</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {renderEditForm()}
            </View>

   <View style={styles.landscapeRightCol}>
              {renderReviewsAndAccount()}
            </View>
          </View>
        ) : (
          <>
          
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <View style={styles.brandSquare}>
                  <Text style={styles.brandSquareText}>C</Text>
                </View>
                <Text style={styles.headerTitle}>My CineVerse</Text>
              </View>

              <View style={styles.topActions}>
                <Pressable
                  style={[
                    styles.iconPill,
                    isEditing && styles.iconPillActive,
                  ]}
                  onPress={() => setIsEditing((prev) => !prev)}
                >
                  <Ionicons
                    name={isEditing ? "close" : "pencil"}
                    size={16}
                    color={isEditing ? "#FFFFFF" : colors.text}
                  />
                </Pressable>

                <Pressable style={styles.iconPill} onPress={toggleTheme}>
                  <Ionicons
                    name={theme === "dark" ? "sunny-outline" : "moon-outline"}
                    size={17}
                    color={NETFLIX_RED}
                  />
                </Pressable>
              </View>
            </View>

         
           <View style={styles.identitySection}>
              <Pressable style={styles.netflixAvatarBox} onPress={pickImage}>
                {profile.avatarUri ? (
                  <Image
                    source={{ uri: profile.avatarUri }}
                    style={styles.netflixAvatarImg}
                  />
                ) : (
                  <View style={styles.netflixAvatarFallback}>
                    <Text style={styles.netflixAvatarInitials}>
                      {initials || "CV"}
                    </Text>
                  </View>
                )}

                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </View>
              </Pressable>

              <Text style={styles.userName}>
                {profile.name || "Movie Lover"}
              </Text>

              <View style={styles.memberMetaRow}>
                <View style={styles.ultraHdBadge}>
                  <Text style={styles.ultraHdText}>ULTRA HD</Text>
                </View>
                <Text style={styles.userEmail}>
                  {profile.email || "Cinema Enthusiast"}
                </Text>
              </View>
            </View>

            {renderEditForm()}

       
            <View style={styles.statsBar}>
              <Pressable
                style={styles.statSlot}
                onPress={() => router.push("/(drawer)/watched")}
              >
                <Text style={styles.statValue}>{watchedMovies.length}</Text>
                <Text style={styles.statLabel}>Watched</Text>
              </Pressable>

              <View style={styles.statDivider} />

              <Pressable
                style={styles.statSlot}
                onPress={() => router.push("/(drawer)/(tabs)/watchlist")}
              >
                <Text style={styles.statValue}>{plannedMovies.length}</Text>
                <Text style={styles.statLabel}>My List</Text>
              </Pressable>

              <View style={styles.statDivider} />

              <Pressable style={styles.statSlot} onPress={handleOpenReviews}>
                <Text style={styles.statValue}>{reviews.length}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </Pressable>

              <View style={styles.statDivider} />

              <Pressable style={styles.statSlot} onPress={handleOpenReviews}>
                <View style={styles.ratingValueRow}>
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <Text style={styles.statValue}>{averageRating}</Text>
                </View>
                <Text style={styles.statLabel}>Avg Score</Text>
              </Pressable>
            </View>

            {renderReviewsAndAccount()}
          </>
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
    scrollContent: {
      flexGrow: 1,
    },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    brandSquare: {
      width: 26,
      height: 26,
      borderRadius: 6,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    brandSquareText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "900",
    },
    headerTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: "900",
      letterSpacing: -0.3,
    },
    topActions: {
      flexDirection: "row",
      gap: 8,
    },
    iconPill: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    iconPillActive: {
      backgroundColor: NETFLIX_RED,
      borderColor: NETFLIX_RED,
    },
    
    landscapeContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 16,
    },
    landscapeLeftCol: {
      width: "43%",
      gap: 10,
    },
    landscapeRightCol: {
      flex: 1,
    },
    landscapeProfileCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    landscapeProfileTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    netflixAvatarBoxSmall: {
      width: 54,
      height: 54,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: NETFLIX_RED,
      position: "relative",
    },
    netflixAvatarImgSmall: {
      width: "100%",
      height: "100%",
      borderRadius: 11,
    },
    netflixAvatarFallbackSmall: {
      width: "100%",
      height: "100%",
      borderRadius: 11,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    netflixAvatarInitialsSmall: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "900",
    },
    cameraBadgeSmall: {
      position: "absolute",
      right: -4,
      bottom: -4,
      width: 20,
      height: 20,
      borderRadius: 7,
      backgroundColor: "#0B0B13",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.25)",
      justifyContent: "center",
      alignItems: "center",
    },
    landscapeIdentityText: {
      flex: 1,
      gap: 2,
    },
    nameBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    userNameSmall: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "900",
    },
    userEmailSmall: {
      color: colors.muted,
      fontSize: 11,
    },
    landscapeCardActions: {
      flexDirection: "row",
      gap: 6,
    },
    iconPillSmall: {
      width: 31,
      height: 31,
      borderRadius: 9,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    statsGridLandscape: {
      gap: 8,
    },
    statsGridRow: {
      flexDirection: "row",
      gap: 8,
    },
    statBoxLandscape: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 11,
      paddingVertical: 9,
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    statValueSmall: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
    },
    statLabelSmall: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "700",
      marginTop: 2,
    },
    
    identitySection: {
      alignItems: "center",
      marginBottom: 20,
    },
    netflixAvatarBox: {
      width: 94,
      height: 94,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: NETFLIX_RED,
      position: "relative",
      marginBottom: 12,
    },
    netflixAvatarImg: {
      width: "100%",
      height: "100%",
      borderRadius: 18,
    },
    netflixAvatarFallback: {
      width: "100%",
      height: "100%",
      borderRadius: 18,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    netflixAvatarInitials: {
      color: "#FFFFFF",
      fontSize: 30,
      fontWeight: "900",
      letterSpacing: 1,
    },
    cameraBadge: {
      position: "absolute",
      right: -5,
      bottom: -5,
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor: "#0B0B13",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.28)",
      justifyContent: "center",
      alignItems: "center",
    },
    userName: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "900",
      letterSpacing: -0.2,
    },
    memberMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 5,
    },
    ultraHdBadge: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: `${NETFLIX_RED}90`,
      backgroundColor: `${NETFLIX_RED}18`,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 4,
    },
    ultraHdText: {
      color: NETFLIX_RED,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.8,
    },
    userEmail: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600",
    },
    
    editCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
      gap: 10,
    },
    editHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 2,
    },
    editTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "900",
    },
    inputBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 46,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
    },
    editActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    cancelBtn: {
      flex: 1,
      height: 42,
      borderRadius: 9,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    cancelBtnText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 13,
    },
    saveBtn: {
      flex: 1.4,
      height: 42,
      borderRadius: 9,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    disabledBtn: {
      opacity: 0.6,
    },
    saveBtnText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 13,
    },
    
    statsBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingVertical: 15,
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    statSlot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    statDivider: {
      width: 1,
      height: 26,
      backgroundColor: colors.border,
    },
    ratingValueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statValue: {
      color: colors.text,
      fontSize: 18,
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
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
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
    writePillBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 16,
    },
    writePillText: {
      color: "#0B0B13",
      fontSize: 12,
      fontWeight: "800",
    },
    reviewsList: {
      gap: 10,
      marginBottom: 24,
    },
    reviewCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surface,
      padding: 11,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reviewPosterWrap: {
      position: "relative",
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    reviewPoster: {
      width: 48,
      height: 70,
    },
    reviewPosterFallback: {
      width: 48,
      height: 70,
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
    reviewBody: {
      flex: 1,
    },
    reviewHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    reviewMovieName: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: "800",
    },
    starPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "rgba(251, 191, 36, 0.14)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    starPillText: {
      color: "#FBBF24",
      fontSize: 11,
      fontWeight: "800",
    },
    reviewSnippet: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
    },
    reviewDate: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 5,
      opacity: 0.75,
    },
    emptyBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    emptyIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: `${NETFLIX_RED}16`,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800",
    },
    emptySub: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    menuGroup: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    menuIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 9,
      backgroundColor: `${NETFLIX_RED}16`,
      justifyContent: "center",
      alignItems: "center",
    },
    menuLabel: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    menuLine: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 60,
    },
  });