import AsyncStorage from "@react-native-async-storage/async-storage";

export const resetUser = async () => {
  await AsyncStorage.removeItem("displayName");
  await AsyncStorage.removeItem("userId");
};

export function normalizeUsername(name: string) {
  return name.trim().toLowerCase();
}
