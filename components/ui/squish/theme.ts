/**
 * Squish — design tokens · Sherbet Pop
 * "periwinkle · candy · bright"
 *
 * Drop-in replacement for the Lavender Mist token file: same exported
 * names and shape, different palette. Swap the import (or route it
 * through theme/index.ts) to preview the whole app in this theme.
 */

export const avatarColors = {
  primary: "#6C63FF",
  deep: "#524AD6",
  plumInk: "#241E45",
  softInk: "#7C76A8",

  blush: "#FF69B4",
  peach: "#FFA145",
  mint: "#33CFA1",
  butter: "#FFC53D",
} as const;

export const colors = {
  // Core palette
  primary: "#6C63FF",
  deep: "#524AD6",
  lilac: "#B9AFFF",
  soft: "#E6E3FF",
  mistBg: "#F4F2FF",
  surface: "#FFFFFF",
  plumInk: "#332C5C",
  softInk: "#8D87B8",

  // Accents — hug types & stickers
  blush: "#FF9BD0",
  peach: "#FFBE73",
  mint: "#66DDB8",
  butter: "#FFD873",
  sky: "#8ABBFF",
} as const;

/** Darken a hex color toward black. amount: 0..1 */
export function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Mix a hex color toward white. amount: 0..1 */
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * amount);
  const g = Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * amount);
  const b = Math.round((n & 255) + (255 - (n & 255)) * amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Font family names. These match the @expo-google-fonts exports.
 * Load them once at app root (see README) — until loaded, RN falls back
 * to the system font, so components stay safe to render.
 */
export const font = {
  display: "Fredoka_600SemiBold", // headings / display
  displayBold: "Fredoka_700Bold",
  ui: "Quicksand_600SemiBold", // interface / body
  uiBold: "Quicksand_700Bold",
  hand: "Caveat_600SemiBold", // handwritten accents
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  button: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Soft drop shadow used across plush surfaces. */
export const shadow = {
  shadowColor: colors.deep,
  shadowOpacity: 0.26,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
} as const;

export type HugTypeKey =
  | "bear"
  | "squeeze"
  | "morning"
  | "night"
  | "cuddle"
  | "cheer";

/** The canonical hug types from the stylesheet. */
export const hugTypes: Record<HugTypeKey, { label: string; accent: string }> = {
  bear: { label: "Bear hug", accent: colors.peach },
  squeeze: { label: "Squeeze", accent: colors.blush },
  morning: { label: "Good morning", accent: colors.butter },
  night: { label: "Goodnight", accent: colors.primary },
  cuddle: { label: "Cuddle", accent: colors.sky },
  cheer: { label: "Cheer up", accent: colors.mint },
};

export const theme = {
  id: "sherbet",
  name: "Sherbet Pop",
  mood: "periwinkle · candy · bright",
  colors,
  avatarColors,
  font,
  radius,
  spacing,
  shadow,
  hugTypes,
} as const;
export default theme;
