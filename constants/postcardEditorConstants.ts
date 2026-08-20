// constants/postcardEditorConstants.ts
//
// Types + option lists for the postcard editor (text overlays only for now).

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

// Single-kind union for now. Sticker overlays can slot back in here later.
export type Overlay = TextOverlay;

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
  { key: "fredoka", label: "Fredoka", family: font.display },
  { key: "caveat", label: "Caveat", family: font.hand },
  { key: "quicksand", label: "Quicksand", family: font.ui },
  // Baloo isn't in theme.ts yet. Load Baloo2_600SemiBold at app root if you
  // want it; until then it falls back to system (no crash).
  { key: "baloo", label: "Baloo", family: "Baloo2_600SemiBold" },
];

export const fontFamilyFor = (key: FontKey) =>
  FONT_OPTIONS.find((f) => f.key === key)?.family ?? font.hand;

/* ------------------------------------------------------------------ */
/*  Colour swatches for text                                          */
/* ------------------------------------------------------------------ */

export const SWATCHES: string[] = [
  colors.softInk,
  colors.plumInk, // dark
  colors.blush, // pink
  colors.peach, // peach
  colors.butter, // yellow
  colors.mint, // green
  colors.sky, // blue
  colors.primary, // purple
];

/* ------------------------------------------------------------------ */
/*  Photo geometry                                                    */
/* ------------------------------------------------------------------ */

/**
 * Size the photo has to be drawn at so it covers `boxWidth × boxHeight`
 * without distortion. The overflowing axis is what the user gets to pan
 * across, so we draw at this size and clip rather than letting Skia's
 * fit="cover" discard the overflow.
 */
export const coverSize = (
  imageWidth: number,
  imageHeight: number,
  boxWidth: number,
  boxHeight: number,
) => {
  if (!imageWidth || !imageHeight) {
    return { width: boxWidth, height: boxHeight };
  }
  const ratio = Math.max(boxWidth / imageWidth, boxHeight / imageHeight);
  return { width: imageWidth * ratio, height: imageHeight * ratio };
};
