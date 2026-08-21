import { Hug } from "../handleHugs";
import { isThreadUnread } from "./thread";

/**
 * Hug list feature flags.
 *
 * TOP_HUGGER: the badge + pinned card + butter-tinted surface. Built and
 * wired, but off until the ranking rule is settled. Flip `enabled` to true
 * and everything downstream (pinning, ring, badge) comes back on together —
 * there is no second copy of the rule anywhere else.
 */
export const TOP_HUGGER = {
  enabled: false,
  /** Minimum hugs received from one person before the badge can appear. */
  minHugs: 10,
} as const;

/**
 * Unread means either the hug itself was never opened, or the other person
 * has added a turn to the thread since I last read it. Both sides can be
 * behind on a thread now, so this no longer branches on who sent the hug.
 */
export const isHugUnread = (hug: Hug, myUid: string) =>
  isThreadUnread(hug, myUid) || (hug.to === myUid && !hug.seenAt);
