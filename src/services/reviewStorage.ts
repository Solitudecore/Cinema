import AsyncStorage from "@react-native-async-storage/async-storage";
import { Review } from "../types/review";

const getStorageKey = (movieId: string) => {
  return `reviews_${movieId}`;
};

export const getReviews = async (movieId: string): Promise<Review[]> => {
  try {
    const data = await AsyncStorage.getItem(getStorageKey(movieId));

    if (!data) {
      return [];
    }

    const reviews: Review[] = JSON.parse(data);

    return reviews;
  } catch (error) {
    console.log("Error getting reviews:", error);
    return [];
  }
};

export const saveReviews = async (
  movieId: string,
  reviews: Review[]
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      getStorageKey(movieId),
      JSON.stringify(reviews)
    );
  } catch (error) {
    console.log("Error saving reviews:", error);
  }
};

export const addReview = async (
  movieId: string,
  review: Review
): Promise<void> => {
  try {
    const reviews = await getReviews(movieId);

    const updatedReviews = [...reviews, review];

    await saveReviews(movieId, updatedReviews);
  } catch (error) {
    console.log("Error adding review:", error);
  }
};

export const getAllReviews = async (): Promise<Review[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();

    const reviewKeys = keys.filter((key) =>
      key.startsWith("reviews_")
    );

    if (reviewKeys.length === 0) {
      return [];
    }

    const storedReviews = await AsyncStorage.multiGet(reviewKeys);

    const allReviews: Review[] = [];

    storedReviews.forEach(([key, value]) => {
      if (value) {
        try {
          const parsed: Review[] = JSON.parse(value);

          if (Array.isArray(parsed)) {
            allReviews.push(...parsed);
          }
        } catch (error) {
          console.log("Could not parse reviews:", key);
        }
      }
    });

    return allReviews;
  } catch (error) {
    console.log("Error getting all reviews:", error);
    return [];
  }
};

export const deleteReview = async (
  movieId: string,
  reviewId: string,
  userId: string
): Promise<void> => {
  try {
    const reviews = await getReviews(movieId);

    const updatedReviews = reviews.filter(
      (review) =>
        !(review.id === reviewId && review.userId === userId)
    );

    await saveReviews(movieId, updatedReviews);
  } catch (error) {
    console.log("Error deleting review:", error);
  }
};