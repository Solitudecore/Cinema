import { Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MovieResponse, MovieDetails, Genre } from "../types/movie";

const BASE_URL = "https://api.themoviedb.org/3";

export const IMAGE_URL = "https://image.tmdb.org/t/p/";

const ACCESS_TOKEN = process.env.EXPO_PUBLIC_TMDB_ACCESS_TOKEN;

const memoryCache = new Map<string, unknown>();
let cacheVersion = 0;
const pendingCacheWrites = new Set<Promise<void>>();

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function tmdbRequest<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  if (!ACCESS_TOKEN) {
    throw new Error("TMDB API Token is missing!");
  }

  const query = new URLSearchParams({
    language: "en-US",
  });

  Object.entries(params).forEach(([key, value]) => {
    query.append(key, String(value));
  });

  const queryString = query.toString();
  const cacheKey = `tmdb_cache_${endpoint}_${queryString}`;
  const requestCacheVersion = cacheVersion;

  const networkPromise = (async () => {
    const response = await fetchWithTimeout(
      `${BASE_URL}${endpoint}?${queryString}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      },
      10000,
    );

    if (!response.ok) {
      throw new Error(`TMDB Error: ${response.status}`);
    }

    const data = (await response.json()) as T;

    if (requestCacheVersion === cacheVersion) {
      memoryCache.set(cacheKey, data);

      const writePromise = AsyncStorage.setItem(
        cacheKey,
        JSON.stringify(data),
      ).catch(() => {});

      pendingCacheWrites.add(writePromise);
      void writePromise.then(() => pendingCacheWrites.delete(writePromise));
    }

    return data;
  })();

  if (memoryCache.has(cacheKey)) {
    networkPromise.catch(() => {});
    return memoryCache.get(cacheKey) as T;
  }

  try {
    const cachedData = await AsyncStorage.getItem(cacheKey);

    if (requestCacheVersion !== cacheVersion) {
      return networkPromise;
    }

    if (cachedData) {
      const parsed = JSON.parse(cachedData) as T;
      memoryCache.set(cacheKey, parsed);
      networkPromise.catch(() => {});
      return parsed;
    }
  } catch {}

  return networkPromise;
}

export const getTrendingMovies = (page = 1) => {
  return tmdbRequest<MovieResponse>("/trending/movie/week", { page });
};

export const getPopularMovies = (page = 1) => {
  return tmdbRequest<MovieResponse>("/movie/popular", { page });
};

export const getTopRatedMovies = (page = 1) => {
  return tmdbRequest<MovieResponse>("/movie/top_rated", { page });
};

export const searchMovies = (query: string, page = 1) => {
  return tmdbRequest<MovieResponse>("/search/movie", {
    query,
    page,
    include_adult: "false",
  });
};

export const getMovieDetails = (id: number) => {
  return tmdbRequest<MovieDetails>(`/movie/${id}`, {
    append_to_response: "credits,videos",
  });
};

export const getCachedMovieBasic = (id: number): MovieDetails | null => {
  const exactKey = `tmdb_cache_/movie/${id}_language=en-US&append_to_response=credits%2Cvideos`;
  if (memoryCache.has(exactKey)) {
    return memoryCache.get(exactKey) as MovieDetails;
  }

  for (const value of memoryCache.values()) {
    if (value && typeof value === "object" && "results" in value) {
      const list = (value as { results?: MovieDetails[] }).results;
      const found = list?.find((item) => item.id === id);
      if (found) return found;
    }
  }

  return null;
};

export const getGenres = async () => {
  const response = await tmdbRequest<{
    genres: Genre[];
  }>("/genre/movie/list");

  return response.genres;
};

export const discoverMovies = (
  page = 1,
  genreId?: number | null,
  minRating = 0,
) => {
  const params: Record<string, string | number> = {
    page,
    sort_by: "popularity.desc",
    include_adult: "false",
  };

  if (genreId !== null && genreId !== undefined) {
    params.with_genres = genreId;
  }

  if (minRating > 0) {
    params["vote_average.gte"] = minRating;
  }

  return tmdbRequest<MovieResponse>("/discover/movie", params);
};

export const prefetchAppData = async () => {
  try {
    const [popularRes, trendingRes, topRatedRes] = await Promise.all([
      getPopularMovies(1),
      getTrendingMovies(1),
      getTopRatedMovies(1),
    ]);

    const combined = [
      ...(trendingRes.results || []).slice(0, 4),
      ...(popularRes.results || []).slice(0, 4),
      ...(topRatedRes.results || []).slice(0, 2),
    ];

    const uniqueMovies = Array.from(
      new Map(combined.map((m) => [m.id, m])).values(),
    ).slice(0, 8);

    uniqueMovies.forEach((movie) => {
      if (movie.poster_path) {
        Image.prefetch(`${IMAGE_URL}w342${movie.poster_path}`).catch(() => {});
      }
      if (movie.backdrop_path) {
        Image.prefetch(`${IMAGE_URL}w780${movie.backdrop_path}`).catch(
          () => {},
        );
      }
    });

    await Promise.allSettled(
      uniqueMovies.map(async (movie) => {
        const details = await getMovieDetails(movie.id);
        const trailer =
          details.videos?.results?.find(
            (v) => v.site === "YouTube" && v.type === "Trailer",
          ) || details.videos?.results?.find((v) => v.site === "YouTube");

        if (trailer?.key) {
          Image.prefetch(
            `https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`,
          ).catch(() => {});
        }
      }),
    );
  } catch {}
};

export const clearTmdbCache = async (): Promise<number> => {
  cacheVersion += 1;
  memoryCache.clear();

  await Promise.allSettled(Array.from(pendingCacheWrites));

  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((key) => key.startsWith("tmdb_cache_"));

  if (cacheKeys.length > 0) {
    await AsyncStorage.multiRemove(cacheKeys);
  }

  return cacheKeys.length;
};
