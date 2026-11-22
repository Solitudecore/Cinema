import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

export const NOTIF_STORAGE_KEY = "cineverse_notifications_enabled";

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return true;
  }

  try {
    if (Platform.OS === "android") {
      try {
        await Notifications.setNotificationChannelAsync("default", {
          name: "CineVerse Reminders",
          importance: Notifications.AndroidImportance.MAX,
        });
      } catch {
        
      }
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Notification permission was denied. Please enable notifications in your device settings."
      );
      return false;
    }

    return true;
  } catch (error) {
    console.log("Native notification fallback active:", error);
 
    return true;
  }
}

export async function sendCineVerseNotification(
  title: string,
  body: string,
  forceSend = false
): Promise<void> {
  try {
    if (!forceSend) {
      const enabled = await AsyncStorage.getItem(NOTIF_STORAGE_KEY);
      if (enabled !== "true") return;
    }

    if (Platform.OS === "web") {
      Alert.alert(title, body);
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null,
      });
      return;
    }

    Alert.alert(title, body);
  } catch {
  
    Alert.alert(title, body);
  }
}