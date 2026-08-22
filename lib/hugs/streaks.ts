import { Timestamp } from "firebase/firestore";
import { UserFriend } from "../handleFriends";

const HOUR_MS = 3_600_000;

/**
 * Hug streaks.
 *
 * A streak is a property of a *pair*, not of a person, so it can't hang off
 * calendar days the way Duolingo's does: the two people may sit in different
 * timezones and there is no shared midnight to agree on. Snapchat has the
 * same problem and solves it with a rolling window from the last exchange —
 * that's the model here.
 *
 * A **streak day** completes when both people have sent the other a hug.
 * The first one needs the two hugs within `windowMs` of each other; after
 * that each further day needs one fresh hug from each side, landing in the
 * window that opens `cooldownMs` after the previous day completed and shuts
 * `expiryMs` after it. The cooldown stops an afternoon of hugs counting as a
 * week; the gap between the two is a full 24h of slack, which is kinder than
 * Snapchat's hard 24h deadline without being a free pass.
 *
 * Nothing sweeps expired streaks — there is no cron — so a streak that has
 * lapsed still sits in Firestore with its old count. Every reader therefore
 * goes through `resolveStreak`, which applies the expiry as it reads. The
 * server does the same before it writes.
 *
 * Keep in sync with functions/src/streaks.ts.
 */
export const STREAK = {
  /** How far apart the two opening hugs may be. */
  windowMs: 24 * HOUR_MS,
  /** Earliest a new streak day can land after the previous one. */
  cooldownMs: 12 * HOUR_MS,
  /** No new streak day in this long and the streak is over. */
  expiryMs: 36 * HOUR_MS,
  /** Warn ("about to lose it") once this little of the window is left. */
  warningMs: 6 * HOUR_MS,
} as const;

/**
 * Whether a hug back keeps a streak alive on the replier's behalf.
 *
 * Off, deliberately. A hug back is a reply inside someone else's hug — cheap,
 * and always available — so counting it would let one person carry the streak
 * for both of them. Snapchat draws the same line: only real snaps count,
 * chats and replies don't. Flip this to true and `onHugBack` starts feeding
 * the streak; nothing else needs to change.
 */
export const HUG_BACKS_COUNT_TOWARD_STREAK = false;

/**
 * The stored half of a streak, as it lives on `users/{uid}/friends/{id}`.
 * Mirrored on both friend docs, so the two sides always show the same number.
 */
export type StreakState = {
  /** Completed streak days. Stale until run through `resolveStreak`. */
  days: number;
  /** Best run this pair has ever had. Never decays. */
  longest: number;
  /** When the most recent streak day completed. */
  lastMutualAt: number | null;
  /** When the current run's first day completed. */
  startedAt: number | null;
};

const ms = (ts?: Timestamp | number | null): number | null => {
  if (ts == null) return null;
  if (typeof ts === "number") return ts || null;
  return ts.toMillis?.() ?? null;
};

/** Reads the stored streak off a friend doc, tolerating docs written before it existed. */
export const streakStateOf = (friend: UserFriend): StreakState => ({
  days: friend.numStreakDays ?? 0,
  longest: friend.longestStreakDays ?? 0,
  lastMutualAt: ms(friend.streakLastMutualAt),
  startedAt: ms(friend.streakStartedAt),
});

/** Drops a streak whose window has closed. Pure — callers persist the result. */
export const expireStreak = (
  state: StreakState,
  now: number = Date.now(),
): StreakState => {
  if (!state.days || state.lastMutualAt == null) {
    return { ...state, days: 0, lastMutualAt: null, startedAt: null };
  }
  if (now - state.lastMutualAt <= STREAK.expiryMs) return state;
  return { ...state, days: 0, lastMutualAt: null, startedAt: null };
};

/**
 * Folds a new hug into the streak.
 *
 * `lastFromMe` / `lastFromThem` are the latest hug each side has sent the
 * other, already including the one being processed. Symmetric, so both friend
 * docs can be advanced from the same call with the arguments swapped and land
 * on the same numbers.
 */
export const advanceStreak = (
  stored: StreakState,
  lastFromMe: number | null,
  lastFromThem: number | null,
  now: number = Date.now(),
): StreakState => {
  const state = expireStreak(stored, now);
  if (lastFromMe == null || lastFromThem == null) return state;

  // Every streak day, the opening one included, needs the two hugs within a
  // day of each other — otherwise a hug sent right after yesterday's day
  // completed could be banked and carry a whole day the sender sat out.
  const mutual = Math.abs(lastFromMe - lastFromThem) <= STREAK.windowMs;

  const completed =
    mutual &&
    (state.lastMutualAt == null ||
      // continuing a run: a fresh hug from each side, after the cooldown
      (lastFromMe > state.lastMutualAt &&
        lastFromThem > state.lastMutualAt &&
        now - state.lastMutualAt >= STREAK.cooldownMs));

  if (!completed) return state;

  const days = state.days + 1;
  return {
    days,
    longest: Math.max(state.longest, days),
    lastMutualAt: Math.max(lastFromMe, lastFromThem),
    startedAt: days === 1 ? now : state.startedAt,
  };
};

/** Who still owes a hug before the next streak day can complete. */
export type StreakPending = "me" | "them" | "both" | null;

export type ResolvedStreak = {
  /** Days to show. Already 0 if the streak lapsed. */
  days: number;
  longest: number;
  /** True while `days` beats the pair's old record. */
  isRecord: boolean;
  /** When the streak lapses if nothing lands. Null when there is no streak. */
  expiresAt: number | null;
  /** Inside the last `warningMs` — the moment to nudge. */
  isExpiring: boolean;
  /** Null once both sides have hugged and only the cooldown is left to run. */
  waitingOn: StreakPending;
};

/**
 * The display-ready streak for a friend, as of `now`. The one entry point for
 * UI: it applies the expiry the server hasn't had a write to apply yet.
 */
export const resolveStreak = (
  friend: UserFriend,
  now: number = Date.now(),
): ResolvedStreak => {
  const state = expireStreak(streakStateOf(friend), now);
  const lastFromMe = ms(friend.lastSentHug);
  const lastFromThem = ms(friend.lastReceivedHug);

  const since = state.lastMutualAt ?? now - STREAK.windowMs;
  const meDone = lastFromMe != null && lastFromMe > since;
  const themDone = lastFromThem != null && lastFromThem > since;

  let waitingOn: StreakPending = null;
  if (!meDone && !themDone) waitingOn = "both";
  else if (!meDone) waitingOn = "me";
  else if (!themDone) waitingOn = "them";

  const expiresAt =
    state.days && state.lastMutualAt != null
      ? state.lastMutualAt + STREAK.expiryMs
      : null;

  return {
    days: state.days,
    longest: state.longest,
    isRecord: state.days > 0 && state.days >= state.longest,
    expiresAt,
    isExpiring: expiresAt != null && expiresAt - now <= STREAK.warningMs,
    waitingOn,
  };
};

/** "2h left" · "9h left" — how long the streak has before it lapses. */
export const streakTimeLeft = (
  expiresAt: number,
  now: number = Date.now(),
): string => {
  const left = expiresAt - now;
  if (left <= 0) return "gone";
  const hrs = Math.floor(left / HOUR_MS);
  if (hrs >= 1) return `${hrs}h left`;
  return `${Math.max(1, Math.floor(left / 60_000))}m left`;
};
