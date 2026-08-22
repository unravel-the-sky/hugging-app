/**
 * Hug streaks, server half.
 *
 * Plain numbers in, plain numbers out, so this file stays a copy of the
 * client's rule rather than a second opinion on it. See lib/hugs/streaks.ts
 * for why the model is a rolling window and not calendar days.
 *
 * Keep in sync with lib/hugs/streaks.ts.
 */

const HOUR_MS = 3_600_000;

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
 * Whether a hug back keeps a streak alive on the replier's behalf. Off — a
 * reply inside someone else's hug is too cheap to carry a mutual streak.
 * See the client copy for the reasoning.
 */
export const HUG_BACKS_COUNT_TOWARD_STREAK = false;

export type StreakState = {
  days: number;
  longest: number;
  lastMutualAt: number | null;
  startedAt: number | null;
};

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
 * Folds a new hug into the streak. Symmetric in its two "last hug" arguments,
 * so both friend docs can be advanced from one call with them swapped.
 */
export const advanceStreak = (
  stored: StreakState,
  lastFromMe: number | null,
  lastFromThem: number | null,
  now: number = Date.now(),
): StreakState => {
  const state = expireStreak(stored, now);
  if (lastFromMe == null || lastFromThem == null) return state;

  // Every streak day needs the two hugs within a day of each other, not just
  // the opening one. See the client copy.
  const mutual = Math.abs(lastFromMe - lastFromThem) <= STREAK.windowMs;

  const completed =
    mutual &&
    (state.lastMutualAt == null ||
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
