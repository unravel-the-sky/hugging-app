// constants/postcardEditorConstants.ts
//
// Shared types + option lists for the postcard editor.
// Overlays are one unified list — text and stickers share a base so a single
// <DraggableOverlay> can transform either kind.

import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, font } from "@/components/ui/squish/theme";

/* ------------------------------------------------------------------ */
/*  Overlays                                                          */
/* ------------------------------------------------------------------ */

export type OverlayBase = {
  id: string;
  /** offset from canvas centre, in px */
  x: number;
  y: number;
  scale: number;
  /** radians */
  rotation: number;
};

export type TextOverlay = OverlayBase & {
  kind: "text";
  text: string;
  fontKey: FontKey;
  size: number;
  color: string;
};

export type StickerOverlay = OverlayBase & {
  kind: "sticker";
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
};

export type Overlay = TextOverlay | StickerOverlay;

export const newOverlayId = () =>
  `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

/* ------------------------------------------------------------------ */
/*  Fonts                                                             */
/* ------------------------------------------------------------------ */

export type FontKey = "caveat" | "fredoka" | "quicksand" | "baloo";

export const FONT_OPTIONS: {
  key: FontKey;
  label: string;
  family: string;
}[] = [
  { key: "caveat", label: "Caveat", family: font.hand },
  { key: "fredoka", label: "Fredoka", family: font.display },
  { key: "quicksand", label: "Quicksand", family: font.ui },
  // Baloo isn't in theme.ts yet. If you want it, load Baloo2_600SemiBold at
  // app root; until then it falls back to system (no crash).
  { key: "baloo", label: "Baloo", family: "Baloo2_600SemiBold" },
];

export const fontFamilyFor = (key: FontKey) =>
  FONT_OPTIONS.find((f) => f.key === key)?.family ?? font.hand;

/* ------------------------------------------------------------------ */
/*  Colour swatches (shared by text + fine-tune UI)                  */
/* ------------------------------------------------------------------ */

export const SWATCHES: string[] = [
  colors.blush, // pink
  colors.peach, // peach
  colors.butter, // yellow
  colors.mint, // green
  colors.sky, // blue
  colors.primary, // purple
  colors.surface, // white
  colors.plumInk, // dark
];

/* ------------------------------------------------------------------ */
/*  Stickers — plain Ionicons, tinted with theme accents             */
/* ------------------------------------------------------------------ */

export const STICKER_BASE_SIZE = 56;

export const STICKERS: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { icon: "heart", color: colors.blush },
  { icon: "star", color: colors.butter },
  { icon: "sparkles", color: colors.primary },
  { icon: "cloud", color: colors.sky },
  { icon: "moon", color: colors.lilac },
  { icon: "paw", color: colors.peach },
  { icon: "happy", color: colors.mint },
  { icon: "sunny", color: colors.butter },
  { icon: "musical-notes", color: colors.primary },
  { icon: "gift", color: colors.blush },
  { icon: "flame", color: colors.peach },
  { icon: "flower", color: colors.blush },
  { icon: "leaf", color: colors.mint },
  { icon: "planet", color: colors.sky },
  { icon: "balloon", color: colors.peach },
  { icon: "ice-cream", color: colors.blush },
];
