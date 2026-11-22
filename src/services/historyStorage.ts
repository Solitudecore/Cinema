import AsyncStorage from "@react-native-async-storage/async-storage";
import { Movie } from "../types/movie";

const RECENTLY_VIEWED_KEY = "cineverse_recently_viewed";
const RECENT_SEARCHES_KEY = "cineverse_recent_searches";

type MovieLike = Omit<Movie, "genre_ids"> & {
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
};

const normalizeMovie = (movie: MovieLike): Movie => {
  const genreIds = Array.isArray(movie.genre_ids)
    ? movie.genre_ids
    : Array.isArray(movie.genres)
      ? movie.genres.map((g) => g.id)
      : [];

  return {
    id: movie.id,
    title: movie.title,
    original_title: movie.original_title,
    overview: movie.overview,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    vote_average: movie.vote_average,
    release_date: movie.release_date,
    genre_ids: genreIds,
  };
};

export const getRecentlyViewed = async (): Promise<Movie[]> => {
  try {
    const raw = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? (JSON.parse(raw) as Movie[]) : [];
  } catch {
    return [];
  }
};

export const addRecentlyViewed = async (movie: MovieLike): Promise<void> => {
  try {
    const current = await getRecentlyViewed();
    const normalized = normalizeMovie(movie);
    const filtered = current.filter((item) => item.id !== normalized.id);
    const updated = [normalized, ...filtered].slice(0, 10);
    await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch {
  
  }
};

export const getRecentSearches = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

export const addRecentSearch = async (query: string): Promise<string[]> => {
  const clean = query.trim();
  if (!clean) return getRecentSearches();

  try {
    const current = await getRecentSearches();
    const filtered = current.filter(
      (item) => item.toLowerCase() !== clean.toLowerCase()
    );
    const updated = [clean, ...filtered].slice(0, 6);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
};

export const clearRecentSearches = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {

  }
};

export const clearRecentHistory = async (): Promise<void> => {
  await AsyncStorage.multiRemove([
    RECENTLY_VIEWED_KEY,
    RECENT_SEARCHES_KEY,
  ]);
};
