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
  // Image-derived colours can arrive as #AARRGGBB; drop the alpha so the
  // luminance below isn't computed from the wrong channels.
  const raw = hex.replace("#", "").slice(-6);
  const n = parseInt(raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.65 ? colors.plumInk : "#FFFFFF";
};

/* ------------------------------------------------------------------ */
/*  Colour derivation                                                 */
/* ------------------------------------------------------------------ */

/** hue of the hearts' default pink, for backdrops that have none of their own */
const STOCK_HEART_HUE = 0.906;

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.replace("#", "").slice(-6), 16);
  if (Number.isNaN(n)) return undefined;
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
};

const rgbToHsl = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h, s, l };
};

const hueToChannel = (p: number, q: number, t: number) => {
  const tt = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
};

/**
 * A colour that reads clearly against `hex` while staying in its family:
 * same hue, saturation floored so washed-out backdrops still give something
 * with life in it, and lightness flipped to the far end. Returns an `rgba()`
 * string, or undefined if the input isn't parseable.
 *
 * Rotating `h` by 0.5 here would give a true complementary instead — bolder,
 * but it fights the photo more often than it flatters it.
 */
export const contrastingTint = (
  hex: string,
  alpha = 0.9,
): string | undefined => {
  const rgb = hexToRgb(hex);
  if (!rgb) return undefined;

  const { h, s, l } = rgbToHsl(rgb);
  // A grey backdrop has no hue to borrow — h would be 0 and the hearts would
  // come out maroon. Lean on the stock pink instead.
  const h2 = s < 0.08 ? STOCK_HEART_HUE : h;
  const s2 = Math.min(1, Math.max(s, 0.55));
  const l2 = l > 0.5 ? 0.24 : 0.82;

  const q = l2 < 0.5 ? l2 * (1 + s2) : l2 + s2 - l2 * s2;
  const p = 2 * l2 - q;
  const to255 = (v: number) => Math.round(v * 255);

  return `rgba(${to255(hueToChannel(p, q, h2 + 1 / 3))},${to255(
    hueToChannel(p, q, h2),
  )},${to255(hueToChannel(p, q, h2 - 1 / 3))},${alpha})`;
};
