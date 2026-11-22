import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { Movie } from "../types/movie";
import { WatchlistItem, WatchlistStatus } from "../types/watchlist";
import { sendCineVerseNotification } from "../services/notifications";

export type WatchlistMovieInput = Omit<Movie, "genre_ids"> & {
  genre_ids?: number[];
  genres?: {
    id: number;
    name: string;
  }[];
};

interface WatchlistContextType {
  items: WatchlistItem[];
  isLoading: boolean;
  addMovie: (movie: WatchlistMovieInput) => Promise<void>;
  removeMovie: (movieId: number) => Promise<void>;
  updateStatus: (movieId: number, status: WatchlistStatus) => Promise<void>;
  toggleMyList: (movie: WatchlistMovieInput) => Promise<void>;
  isInMyList: (movieId: number) => boolean;
  isWatched: (movieId: number) => boolean;
}

export const WatchlistContext = createContext<WatchlistContextType | undefined>(
  undefined
);

const STORAGE_KEY = "cineverse_watchlist";

const getStorageKey = (uid: string) => `${STORAGE_KEY}_${uid}`;

interface Props {
  children: ReactNode;
}

const normalizeMovie = (movie: WatchlistMovieInput): Movie => {
  const genreIds = Array.isArray(movie.genre_ids)
    ? movie.genre_ids
    : Array.isArray(movie.genres)
      ? movie.genres.map((genre) => genre.id)
      : [];

  return {
    ...movie,
    genre_ids: genreIds,
  };
};

export function WatchlistProvider({ children }: Props) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const itemsRef = useRef<WatchlistItem[]>([]);
  const activeUidRef = useRef<string | null>(auth.currentUser?.uid ?? null);
  const loadRequestRef = useRef(0);

  const saveWatchlist = useCallback(
    async (uid: string, updatedItems: WatchlistItem[]) => {
      try {
        await AsyncStorage.setItem(
          getStorageKey(uid),
          JSON.stringify(updatedItems)
        );
      } catch {
        
      }
    },
    []
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const uid = user?.uid ?? null;
      const requestId = ++loadRequestRef.current;

      activeUidRef.current = uid;

      itemsRef.current = [];
      setItems([]);
      setIsLoading(true);

      if (!uid) {
        setIsLoading(false);
        return;
      }

      try {
        const storedData = await AsyncStorage.getItem(getStorageKey(uid));

        if (
          requestId !== loadRequestRef.current ||
          activeUidRef.current !== uid
        ) {
          return;
        }

        if (storedData) {
          const parsedItems = JSON.parse(storedData) as WatchlistItem[];

          const normalizedItems = Array.isArray(parsedItems)
            ? parsedItems
                .filter((item) => item?.movie)
                .map((item) => ({
                  ...item,
                  movie: normalizeMovie(item.movie),
                }))
            : [];

          itemsRef.current = normalizedItems;
          setItems(normalizedItems);
        }
      } catch {

      } finally {
        if (
          requestId === loadRequestRef.current &&
          activeUidRef.current === uid
        ) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      unsubscribe();
      loadRequestRef.current += 1;
      activeUidRef.current = null;
    };
  }, []);

  const addMovie = useCallback(
    async (movie: WatchlistMovieInput) => {
      const uid = activeUidRef.current ?? auth.currentUser?.uid ?? null;

      if (!uid) return;

      const prevItems = itemsRef.current;

      const existingMovie = prevItems.find(
        (item) => item.movie.id === movie.id
      );

      let updatedItems: WatchlistItem[];

      if (existingMovie) {
        if (existingMovie.status !== "watched") {
          return;
        }

        updatedItems = [
          {
            ...existingMovie,
            movie: normalizeMovie(movie),
            status: "plan_to_watch" as const,
            addedAt: new Date().toISOString(),
          },
          ...prevItems.filter((item) => item.movie.id !== movie.id),
        ];
      } else {
        const normalizedMovie = normalizeMovie(movie);

        updatedItems = [
          {
            movie: normalizedMovie,
            status: "plan_to_watch",
            addedAt: new Date().toISOString(),
          },
          ...prevItems,
        ];
      }

      itemsRef.current = updatedItems;
      setItems(updatedItems);

      await saveWatchlist(uid, updatedItems);

      try {
        await sendCineVerseNotification(
          "Added to My List 🎬",
          `"${movie.title}" has been saved to My List.`
        );
      } catch {
  
      }
    },
    [saveWatchlist]
  );

  const removeMovie = useCallback(
    async (movieId: number) => {
      const uid = activeUidRef.current ?? auth.currentUser?.uid ?? null;

      if (!uid) return;

      const updatedItems = itemsRef.current.filter(
        (item) => item.movie.id !== movieId
      );

      itemsRef.current = updatedItems;
      setItems(updatedItems);

      await saveWatchlist(uid, updatedItems);
    },
    [saveWatchlist]
  );

  const toggleMyList = useCallback(
    async (movie: WatchlistMovieInput) => {
      const existing = itemsRef.current.find(
        (item) => item.movie.id === movie.id
      );

      if (existing && existing.status === "plan_to_watch") {
        await removeMovie(movie.id);
      } else {
        await addMovie(movie);
      }
    },
    [addMovie, removeMovie]
  );

  const updateStatus = useCallback(
    async (movieId: number, status: WatchlistStatus) => {
      const uid = activeUidRef.current ?? auth.currentUser?.uid ?? null;

      if (!uid) return;

      const targetItem = itemsRef.current.find(
        (item) => item.movie.id === movieId
      );

      if (!targetItem) return;

      const updatedItems = itemsRef.current.map((item) =>
        item.movie.id === movieId
          ? {
              ...item,
              status,
            }
          : item
      );

      itemsRef.current = updatedItems;
      setItems(updatedItems);

      await saveWatchlist(uid, updatedItems);

      if (status === "watched") {
        try {
          await sendCineVerseNotification(
            "Title Completed ✅",
            `You marked "${targetItem.movie.title}" as watched!`
          );
        } catch {
    
        }
      }
    },
    [saveWatchlist]
  );

  const isInMyList = useCallback(
    (movieId: number) =>
      items.some(
        (item) =>
          item.movie.id === movieId && item.status === "plan_to_watch"
      ),
    [items]
  );

  const isWatched = useCallback(
    (movieId: number) =>
      items.some(
        (item) => item.movie.id === movieId && item.status === "watched"
      ),
    [items]
  );

  const contextValue = useMemo(
    () => ({
      items,
      isLoading,
      addMovie,
      removeMovie,
      updateStatus,
      toggleMyList,
      isInMyList,
      isWatched,
    }),
    [
      items,
      isLoading,
      addMovie,
      removeMovie,
      updateStatus,
      toggleMyList,
      isInMyList,
      isWatched,
    ]
  );

  return (
    <WatchlistContext.Provider value={contextValue}>
      {children}
    </WatchlistContext.Provider>
  );
}