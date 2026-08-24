import { Hug } from "@/lib/handleHugs";
import { byNewest, dayKey, dayTitle, hugMillis } from "./time";

/**
 * Which end of the hug we're looking from.
 * Everything below is written in terms of the *counterparty* — the other
 * person — so no component has to reason about `from` vs `to` again.
 */
export type Direction = "incoming" | "outgoing";

export type Counterparty = { uid: string; name: string };

export const counterpartyOf = (hug: Hug, direction: Direction): Counterparty =>
  direction === "incoming"
    ? { uid: hug.from, name: hug.fromName || "Someone" }
    : { uid: hug.to, name: hug.toName || "Someone" };

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
      name: counterpartyOf(sorted[0], direction).name,
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

/* ------------------------------------------------------------------ */
/* Timeline: collapse a run of hugs with one person                    */
/* ------------------------------------------------------------------ */

/**
 * A day's timeline is a mix of one-off hugs and per-person clusters. Twenty
 * hugs from one friend in an afternoon is one relationship, not twenty rows.
 */
export type DayEntry =
  | { kind: "hug"; key: string; hug: Hug }
  | { kind: "cluster"; key: string; uid: string; name: string; hugs: Hug[] };

/** Hugs with one person, in one day, before the run collapses into a row. */
export const CLUSTER_MIN = 3;

/**
 * Collapses each person's run within a day, leaving everyone below the
 * threshold as plain rows. Clusters sit where their newest hug sat, so the
 * day stays in recency order and nothing jumps to the top by being frequent.
 *
 * `key` is unique within the day only — the caller prefixes it with the day's
 * own key, so two days of hugs with the same person collapse independently.
 */
export const clusterByPerson = (
  hugs: Hug[],
  directionOf: (hug: Hug) => Direction,
  min: number = CLUSTER_MIN,
): DayEntry[] => {
  const buckets = new Map<string, Hug[]>();

  for (const hug of hugs) {
    const { uid } = counterpartyOf(hug, directionOf(hug));
    const bucket = buckets.get(uid);
    if (bucket) bucket.push(hug);
    else buckets.set(uid, [hug]);
  }

  const entries: DayEntry[] = [];

  for (const [uid, bucket] of buckets) {
    if (bucket.length < min) {
      for (const hug of bucket) entries.push({ kind: "hug", key: hug.id, hug });
      continue;
    }

    const sorted = [...bucket].sort(byNewest);
    entries.push({
      kind: "cluster",
      key: `person:${uid}`,
      uid,
      name: counterpartyOf(sorted[0], directionOf(sorted[0])).name,
      hugs: sorted,
    });
  }

  const newest = (entry: DayEntry) =>
    entry.kind === "hug" ? hugMillis(entry.hug) : hugMillis(entry.hugs[0]);

  return entries.sort((a, b) => newest(b) - newest(a));
};
