import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

export async function registerForPushNotifications(): Promise<
  null | undefined | string
> {
  console.log("Device.isDevice is: ", Device.isDevice);
  console.log("platform.OS is: ", Platform.OS);
  // if (!Device.isDevice) return null;
  if (Platform.OS === "web") return null;

  const Notifications = await import("expo-notifications");

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  console.log("finalStatus is: ", finalStatus);
  if (finalStatus !== "granted") return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  console.log("expo projectId is: ", projectId);

  if (!projectId) {
    console.warn("Missing Expo projectId");
    return null;
  }

  console.log("expo projectId is: ", projectId);

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return token;
}
