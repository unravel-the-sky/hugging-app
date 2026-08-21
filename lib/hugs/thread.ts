import type { Hug, HugBack } from "../handleHugs";

/**
 * The hug-back thread: whose turn it is, how many turns are left, and what
 * counts as unread. One place, so the client, the list badges and the
 * Firestore rules can't drift apart on the rule.
 *
 * Shape of a thread: the hug itself is the sender's first turn, so the thread
 * always opens with `to` and alternates from there.
 */

/** Hug backs one person may send per hug. The thread caps at twice this. */
export const MAX_HUG_BACKS_PER_PERSON = 3;
export const MAX_HUG_BACKS = MAX_HUG_BACKS_PER_PERSON * 2;

/**
 * Hugs sent before threads have a single `hugBackNote` and were never
 * backfilled. They still render — as a one-item thread — but they stay
 * closed: replying to one would mean writing an array whose first item the
 * rules can't verify against anything.
 */
const isLegacyHugBack = (hug: Hug) =>
  !hug.hugBacks?.length && !!hug.hugBackNote;

/** The thread oldest-first, with a legacy hug back folded in as item zero. */
export function threadOf(hug: Hug): HugBack[] {
  if (hug.hugBacks?.length) return hug.hugBacks;
  if (hug.hugBackNote && hug.hugBackAt) {
    return [{ from: hug.to, note: hug.hugBackNote, createdAt: hug.hugBackAt }];
  }
  return [];
}

/** Whether `uid` may add a turn right now. */
export function canHugBack(hug: Hug, uid: string): boolean {
  if (uid !== hug.from && uid !== hug.to) return false;
  if (hug.blockedDelivery) return false;
  if (isLegacyHugBack(hug)) return false;

  const thread = hug.hugBacks ?? [];
  if (thread.length >= MAX_HUG_BACKS) return false;

  // Nobody has answered yet, so the hug's recipient goes first.
  if (thread.length === 0) return uid === hug.to;

  // Strict alternation: you can't hug back your own hug back.
  return thread[thread.length - 1].from !== uid;
}

/** Turns `uid` has left on this hug, for the "2 left" hint. */
export function hugBacksLeft(hug: Hug, uid: string): number {
  if (isLegacyHugBack(hug)) return 0;
  const mine = (hug.hugBacks ?? []).filter((item) => item.from === uid).length;
  return Math.max(0, MAX_HUG_BACKS_PER_PERSON - mine);
}

/** When `uid` last read the thread, falling back to the legacy field. */
export function threadSeenAt(hug: Hug, uid: string) {
  return (
    hug.seenAtBy?.[uid] ?? (uid === hug.from ? hug.hugBackSeenAt : undefined)
  );
}

/** A turn from the other person that `uid` hasn't read yet. */
export function isThreadUnread(hug: Hug, uid: string): boolean {
  const thread = threadOf(hug);
  const last = thread[thread.length - 1];
  if (!last || last.from === uid) return false;

  const seen = threadSeenAt(hug, uid);
  return !seen || seen.toMillis() < last.createdAt.toMillis();
}
