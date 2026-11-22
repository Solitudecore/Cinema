import React, { useContext, useMemo } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Movie } from "../types/movie";
import { IMAGE_URL } from "../services/tmdb";
import { useAppTheme } from "../hooks/useAppTheme";
import { WatchlistContext } from "../context/WatchlistContext";
import type { ThemeColors } from "../context/ThemeContext";

const NETFLIX_RED = "#E50914";
const NETFLIX_GREEN = "#46D369";

interface Props {
  movie: Movie;
  onPress: () => void;
  width?: number;
}

const MovieCard = React.memo(function MovieCard({
  movie,
  onPress,
  width,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const watchlist = useContext(WatchlistContext);

  const inMyList = watchlist?.isInMyList(movie.id) ?? false;
  const watched = watchlist?.isWatched(movie.id) ?? false;

  const voteAverage = movie.vote_average ?? 0;
  const matchScore = Math.round(voteAverage * 10);
  const releaseYear = movie.release_date?.slice(0, 4);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        width ? { width } : { flex: 1 },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.posterWrap}>
        {movie.poster_path ? (
          <Image
            source={{
              uri: `${IMAGE_URL}w342${movie.poster_path}`,
            }}
            style={styles.poster}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.poster, styles.placeholder]}>
            <Ionicons name="film-outline" size={26} color={colors.muted} />
            <Text style={styles.placeholderText}>No Poster</Text>
          </View>
        )}
        
        <View style={styles.brandTag}>
          <Text style={styles.brandTagText}>C</Text>
        </View>


        {watchlist ? (
          <Pressable
            hitSlop={6}
            style={[
              styles.quickListBtn,
              inMyList && styles.quickListBtnActive,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              watchlist.toggleMyList(movie);
            }}
          >
            <Ionicons
              name={inMyList ? "checkmark" : watched ? "refresh" : "add"}
              size={14}
              color="#FFFFFF"
            />
          </Pressable>
        ) : null}
        
        {watched && !inMyList ? <View style={styles.watchedBottomBar} /> : null}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {movie.title}
      </Text>

      <View style={styles.metaRow}>
        {matchScore >= 50 ? (
          <Text style={styles.matchText}>{matchScore}%</Text>
        ) : null}

        <Text style={styles.rating}>★ {voteAverage.toFixed(1)}</Text>

        {releaseYear ? <Text style={styles.year}>{releaseYear}</Text> : null}
      </View>
    </Pressable>
  );
});

export default MovieCard;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      marginBottom: 14,
    },
    pressed: {
      opacity: 0.84,
    },
    posterWrap: {
      position: "relative",
      width: "100%",
      aspectRatio: 2 / 3,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    poster: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.card,
    },
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 8,
    },
    placeholderText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
    },
    brandTag: {
      position: "absolute",
      top: 6,
      left: 6,
      width: 17,
      height: 17,
      borderRadius: 4,
      backgroundColor: NETFLIX_RED,
      justifyContent: "center",
      alignItems: "center",
    },
    brandTagText: {
      color: "#FFFFFF",
      fontSize: 9.5,
      fontWeight: "900",
    },
    quickListBtn: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "rgba(9, 9, 16, 0.72)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.25)",
      justifyContent: "center",
      alignItems: "center",
    },
    quickListBtnActive: {
      backgroundColor: NETFLIX_RED,
      borderColor: NETFLIX_RED,
    },
    watchedBottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
      backgroundColor: NETFLIX_RED,
    },
    title: {
      color: colors.text,
      fontSize: 13.5,
      fontWeight: "800",
      marginTop: 7,
      letterSpacing: -0.1,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 3,
    },
    matchText: {
      color: NETFLIX_GREEN,
      fontSize: 11,
      fontWeight: "800",
    },
    rating: {
      color: "#FBBF24",
      fontSize: 11,
      fontWeight: "800",
    },
    year: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "600",
      marginLeft: "auto",
    },
  });