import AsyncStorage from "@react-native-async-storage/async-storage";

import { UserProfile } from "../types/profile";

const PROFILE_KEY = "cineverse_user_profile";

const DEFAULT_PROFILE: UserProfile = {
  name: "Movie Lover",
  email: "",
  avatarUri: null,
};

export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const data = await AsyncStorage.getItem(PROFILE_KEY);

    return data ? JSON.parse(data) : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};
