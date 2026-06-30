import { useMemo } from "react";

/**
 * Short, evergreen "warm thoughts" for the home card.
 * Curate freely — or move these into a Firestore `thoughts` collection later
 * and swap useDailyThought to read from useArticles-style hook.
 */
export const WARM_THOUGHTS = [
  "A 20-second hug lowers stress hormones and boosts oxytocin — the bonding chemical.",
  "A hug can slow your heart rate and ease blood pressure within seconds.",
  "Affectionate touch tells the nervous system it's safe to relax.",
  "People who hug more often tend to feel less lonely and more supported.",
  "Holding someone you trust can dull the brain's response to pain.",
  "Even a brief hug releases oxytocin in both people at once.",
  "Warmth shared is warmth doubled — connection is contagious.",
] as const;

function localDayIndex(date = new Date()) {
  const midnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  return Math.floor(midnight.getTime() / 86_400_000);
}

/** Stable for the whole day, rotates at local midnight. */
export function useDailyThought(userOffset = 0) {
  return useMemo(
    () => WARM_THOUGHTS[(localDayIndex() + userOffset) % WARM_THOUGHTS.length],
    [userOffset],
  );
}
