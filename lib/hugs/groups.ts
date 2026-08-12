import { Hug } from "@/lib/handleHugs";
import { byNewest, dayKey, dayTitle, hugMillis } from "./time";

/**
 * Which end of the hug we're looking from.
 * Everything below is written in terms of the *counterparty* — the other
 * person — so no component has to reason about `from` vs `to` again.
 */
export type Direction = "incoming" | "outgoing";

export type Counterparty = { uid: string; name: string; isBlocked?: boolean };

/** What a blocked person's past hugs are filed under. */
export const BLOCKED_NAME = "Blocked user";

/**
 * Pass `blockedUids` (from `useBlocks`) to file hugs from people you blocked
 * under a neutral name — the memories stay, the person doesn't.
 */
export const counterpartyOf = (
  hug: Hug,
  direction: Direction,
  blockedUids?: ReadonlySet<string>,
): Counterparty => {
  const other =
    direction === "incoming"
      ? { uid: hug.from, name: hug.fromName || "Someone" }
      : { uid: hug.to, name: hug.toName || "Someone" };

  return blockedUids?.has(other.uid)
    ? { ...other, name: BLOCKED_NAME, isBlocked: true }
    : other;
};

/* ------------------------------------------------------------------ */
/* Received tab: group by person                                       */
/* ------------------------------------------------------------------ */
export type PersonGroup = {
  uid: string;
  name: string;
  hugs: Hug[];
  count: number;
  last: Hug;
};

/**
 * One group per counterparty, each group's hugs newest first,
 * groups ordered by most recent hug.
 */
export const groupByPerson = (
  hugs: Hug[],
  direction: Direction,
  blockedUids?: ReadonlySet<string>,
): PersonGroup[] => {
  const buckets = new Map<string, Hug[]>();

  for (const hug of hugs) {
    const { uid } = counterpartyOf(hug, direction);
    const bucket = buckets.get(uid);
    if (bucket) bucket.push(hug);
    else buckets.set(uid, [hug]);
  }

  const groups: PersonGroup[] = [];
  for (const [uid, bucket] of buckets) {
    const sorted = [...bucket].sort(byNewest);
    groups.push({
      uid,
      name: counterpartyOf(sorted[0], direction, blockedUids).name,
      hugs: sorted,
      count: sorted.length,
      last: sorted[0],
    });
  }

  return groups.sort((a, b) => hugMillis(b.last) - hugMillis(a.last));
};

/**
 * The counterparty with the most hugs, or null if nobody clears the
 * threshold. Ties resolve to whoever hugged most recently, because
 * `groups` arrives sorted by recency and this keeps the first winner.
 */
export const topHuggerUid = (
  groups: PersonGroup[],
  minHugs: number,
): string | null => {
  let best: PersonGroup | undefined;
  for (const group of groups) {
    if (!best || group.count > best.count) best = group;
  }
  return best && best.count >= minHugs ? best.uid : null;
};

/** Moves the top hugger to the front, leaving the rest in recency order. */
export const pinTopHugger = (
  groups: PersonGroup[],
  uid: string | null,
): PersonGroup[] => {
  if (!uid) return groups;
  const index = groups.findIndex((group) => group.uid === uid);
  if (index <= 0) return groups;
  return [groups[index], ...groups.filter((_, i) => i !== index)];
};

/* ------------------------------------------------------------------ */
/* Sent tab: group by calendar day                                     */
/* ------------------------------------------------------------------ */

export type DayGroup = {
  key: string;
  title: string;
  hugs: Hug[];
};

/** Newest day first, newest hug first within each day. */
export const groupByDay = (hugs: Hug[], now: Date = new Date()): DayGroup[] => {
  const buckets = new Map<string, Hug[]>();

  for (const hug of [...hugs].sort(byNewest)) {
    const key = dayKey(hugMillis(hug));
    const bucket = buckets.get(key);
    if (bucket) bucket.push(hug);
    else buckets.set(key, [hug]);
  }

  return [...buckets.entries()]
    .map(([key, dayHugs]) => ({
      key,
      title: dayTitle(hugMillis(dayHugs[0]), now),
      hugs: dayHugs,
    }))
    .sort((a, b) => Number(b.key) - Number(a.key));
};
