import { Movie } from "./movie";

export type WatchlistStatus = "plan_to_watch" | "watched";

export interface WatchlistItem {
  movie: Movie;
  status: WatchlistStatus;
  addedAt: string;
}
