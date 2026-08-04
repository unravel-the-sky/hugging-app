import { Hug } from "@/lib/handleHugs";
import { Timestamp } from "firebase/firestore";
import { DayGroup } from "./groups";

const DAY_MS = 86_400_000_000;

/**
 * Millis of a hug's createdAt.
 *
 * Returns 0 while the server timestamp is still pending (optimistic writes),
 * which callers treat as "now" — see `dayTitle`.
 */
export const hugMillis = (hug: Hug): number =>
  (hug.createdAt as Timestamp | undefined)?.toDate?.().getTime?.() ?? 0;

/** Newest first. Pass to `[...hugs].sort(byNewest)`. */
export const byNewest = (a: Hug, b: Hug): number => hugMillis(b) - hugMillis(a);

/** "just now" · "12m ago" · "3h ago" · "yesterday" · "4d ago" */
export const relTime = (ms: number): string => {
  if (!ms) return "just now";

  const mins = Math.floor((Date.now() - ms) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
};

/** Local midnight, so day boundaries survive DST shifts. */
const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * Stable key for the calendar day a hug belongs to.
 * Used to bucket the Sent tab; never shown to the user.
 */
export const dayKey = (ms: number): string =>
  String(startOfDay(new Date(ms || Date.now())));

/**
 * Section title for a calendar day:
 * "Today" · "Yesterday" · "Saturday" (within the last week) ·
 * "3 March" · "3 March 2025" (older than the current year).
 */
export const dayTitle = (ms: number, now: Date = new Date()): string => {
  const date = new Date(ms || Date.now());
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);

  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7)
    return date.toLocaleDateString(undefined, { weekday: "long" });

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
};

export const isSameDay = (a: Date, b: Date) =>
  a.getDate() === b.getDate() &&
  a.getMonth() === b.getMonth() &&
  a.getFullYear() === b.getFullYear();

export const isTodayGroup = (day: DayGroup) => {
  const first = day.hugs.find((hug) => hug.createdAt);
  if (!first?.createdAt) return false;
  return isSameDay(first.createdAt.toDate(), new Date());
};

export const isToday = (day: DayGroup) =>
  day.key === new Date().toISOString().slice(0, 10);

export const COLLAPSE_AFTER_DAYS = 7;

export const dayGroupAgeInDays = (day: DayGroup): number | null => {
  const first = day.hugs.find((hug) => hug.createdAt);
  if (!first?.createdAt) return null;
  return Math.round(
    (startOfDay(new Date()) - startOfDay(first.createdAt.toDate())) / DAY_MS,
  );
};

export const isRecentGroup = (day: DayGroup) => {
  const age = dayGroupAgeInDays(day);
  return age === null || age < COLLAPSE_AFTER_DAYS;
};
