import AsyncStorage from "@react-native-async-storage/async-storage";

export const resetUser = async () => {
  await AsyncStorage.removeItem("displayName");
  await AsyncStorage.removeItem("userId");
};

export function normalizeUsername(name: string) {
  return name.trim().toLowerCase();
}

export const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};
