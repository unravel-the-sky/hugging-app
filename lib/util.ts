import AsyncStorage from "@react-native-async-storage/async-storage";
import { Hug } from "./handleHugs";
import { colors } from "@/components/ui/squish";
import { DayGroup } from "./hugs/groups";

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
  const weeks = Math.floor(days / 7);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  return date.toLocaleDateString();
};

export const getNote = (hug: Hug): string | undefined => {
  const h = hug as { note?: string; message?: string };
  return h.note ?? h.message;
};

export const AVATAR_PALETTE = [
  colors.blush,
  colors.peach,
  colors.mint,
  colors.butter,
  colors.sky,
  colors.lilac,
] as const;

export const avatarColor = (seed = ""): string => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
};

export const readableText = (hex: string): string => {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.65 ? colors.plumInk : "#FFFFFF";
};
