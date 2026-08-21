import { Hug } from "@/lib/handleHugs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Timestamp } from "firebase/firestore";

/**
 * Last-known hugs, per user and direction, so a cold start paints from disk
 * instead of waiting on Firestore. The JS SDK has no persistent cache on
 * React Native (it needs IndexedDB), so this stands in for one.
 *
 * This is a render cache, not a source of truth: the live snapshot always
 * overwrites it, and nothing here is ever written back to Firestore.
 */

type Direction = "incoming" | "outgoing";

/**
 * `Timestamp` survives JSON as plain `{seconds, nanoseconds}` and loses its
 * methods, which `hugMillis`/`groupByDay` call. Revived explicitly rather
 * than via `toJSON` so the shape doesn't drift with the SDK version.
 */
const TIMESTAMP_FIELDS = [
  "createdAt",
  "seenAt",
  "hugBackAt",
  "hugBackSeenAt",
] as const;

type StoredTimestamp = { seconds: number; nanoseconds: number };

const cacheKey = (uid: string, direction: Direction) =>
  `hugs:${uid}:${direction}`;

const isStoredTimestamp = (value: unknown): value is StoredTimestamp =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as StoredTimestamp).seconds === "number" &&
  typeof (value as StoredTimestamp).nanoseconds === "number";

const store = (value: Timestamp): StoredTimestamp => ({
  seconds: value.seconds,
  nanoseconds: value.nanoseconds,
});

function serialize(hugs: Hug[]) {
  return hugs.map((hug) => {
    const out: Record<string, unknown> = { ...hug };
    for (const field of TIMESTAMP_FIELDS) {
      const value = hug[field];
      if (value) out[field] = store(value);
    }

    // The thread carries timestamps one and two levels down, so they need
    // the same treatment as the top-level fields.
    if (hug.hugBacks) {
      out.hugBacks = hug.hugBacks.map((item) => ({
        ...item,
        createdAt: store(item.createdAt),
      }));
    }
    if (hug.seenAtBy) {
      out.seenAtBy = Object.fromEntries(
        Object.entries(hug.seenAtBy).map(([uid, at]) => [uid, store(at)]),
      );
    }

    return out;
  });
}

function revive(raw: unknown): Hug[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const hug = { ...entry } as Record<string, unknown>;
    if (typeof hug.id !== "string") return [];

    for (const field of TIMESTAMP_FIELDS) {
      const value = hug[field];
      if (isStoredTimestamp(value)) {
        hug[field] = new Timestamp(value.seconds, value.nanoseconds);
      } else if (value !== undefined) {
        // Unrecognised shape — drop it rather than hand callers something
        // that looks like a Timestamp but has no toDate().
        delete hug[field];
      }
    }

    // A thread item without a usable createdAt can't be ordered or compared
    // against a seen marker, so the whole thread is dropped rather than
    // rendered half-broken; the live snapshot restores it moments later.
    if (Array.isArray(hug.hugBacks)) {
      const items = hug.hugBacks as Record<string, unknown>[];
      hug.hugBacks = items.every(
        (item) => item && isStoredTimestamp(item.createdAt),
      )
        ? items.map((item) => ({
            ...item,
            createdAt: new Timestamp(
              (item.createdAt as StoredTimestamp).seconds,
              (item.createdAt as StoredTimestamp).nanoseconds,
            ),
          }))
        : undefined;
    } else if (hug.hugBacks !== undefined) {
      delete hug.hugBacks;
    }

    if (typeof hug.seenAtBy === "object" && hug.seenAtBy !== null) {
      hug.seenAtBy = Object.fromEntries(
        Object.entries(hug.seenAtBy as Record<string, unknown>).flatMap(
          ([uid, at]) =>
            isStoredTimestamp(at)
              ? [[uid, new Timestamp(at.seconds, at.nanoseconds)]]
              : [],
        ),
      );
    } else if (hug.seenAtBy !== undefined) {
      delete hug.seenAtBy;
    }

    return [hug as unknown as Hug];
  });
}

/**
 * Returns `null` when nothing has been cached yet, so callers can tell
 * "never loaded" apart from "loaded, genuinely empty".
 */
export async function readCachedHugs(
  uid: string,
  direction: Direction,
): Promise<Hug[] | null> {
  try {
    const stored = await AsyncStorage.getItem(cacheKey(uid, direction));
    if (!stored) return null;
    return revive(JSON.parse(stored));
  } catch {
    return null;
  }
}

/** Fire-and-forget: a failed cache write should never disrupt rendering. */
export function writeCachedHugs(
  uid: string,
  direction: Direction,
  hugs: Hug[],
): void {
  AsyncStorage.setItem(
    cacheKey(uid, direction),
    JSON.stringify(serialize(hugs)),
  ).catch(() => {});
}

/** Hug notes are personal; don't leave them on the device after sign-out. */
export function clearCachedHugs(uid: string): void {
  AsyncStorage.multiRemove([
    cacheKey(uid, "incoming"),
    cacheKey(uid, "outgoing"),
  ]).catch(() => {});
}
