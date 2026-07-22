import { db } from "@/lib/firebaseConfig";
import {
  invalidateStorageUrl,
  resolveStorageUrl,
} from "@/lib/cache/storageurls";
import {
  collection,
  documentId,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThumbInfo = { avatar?: string | null; photoThumbPath?: string };

type CachedInfo = ThumbInfo & { at: number };

/**
 * How long a cached user doc is trusted before we look again. Long enough
 * that a session costs nothing, short enough that a friend's new avatar
 * shows up the same day. Their *own* change is instant via invalidateAvatar.
 */
const INFO_TTL_MS = 6 * 60 * 60 * 1000;

/** Firestore's `in` limit. It was 10 on older SDKs — check yours. */
const IN_CHUNK = 30;

const diskKey = (uid: string) => `avatarInfo:${uid}`;

const memory = new Map<string, Promise<ThumbInfo>>();

/* ------------------------------------------------------------------ */
/* Batched user-doc reads                                              */
/* ------------------------------------------------------------------ */

type Waiter = {
  resolve: (info: ThumbInfo) => void;
  reject: (err: unknown) => void;
};

let queue = new Map<string, Waiter[]>();
let scheduled = false;

/**
 * Collects uids requested within the same ~10ms and fetches them together.
 * A list rendering 40 rows across 12 people becomes one query, not twelve.
 */
function enqueue(uid: string): Promise<ThumbInfo> {
  return new Promise((resolve, reject) => {
    const waiters = queue.get(uid) ?? [];
    waiters.push({ resolve, reject });
    queue.set(uid, waiters);

    if (!scheduled) {
      scheduled = true;
      setTimeout(flush, 10);
    }
  });
}

async function flush() {
  scheduled = false;
  const batch = queue;
  queue = new Map();

  const uids = [...batch.keys()];

  for (let i = 0; i < uids.length; i += IN_CHUNK) {
    const chunk = uids.slice(i, i + IN_CHUNK);

    try {
      const snap = await getDocs(
        query(collection(db, "users"), where(documentId(), "in", chunk)),
      );

      const found = new Map<string, ThumbInfo>();
      snap.forEach((docSnap) => {
        const data = docSnap.data() as ThumbInfo | undefined;
        found.set(docSnap.id, {
          avatar: data?.avatar,
          photoThumbPath: data?.photoThumbPath,
        });
      });

      for (const uid of chunk) {
        // A missing doc is a real answer: no photo. Cache it as such.
        const info = found.get(uid) ?? {};
        writeDisk(uid, info);
        batch.get(uid)?.forEach((waiter) => waiter.resolve(info));
      }
    } catch (err) {
      for (const uid of chunk) {
        memory.delete(uid);
        batch.get(uid)?.forEach((waiter) => waiter.reject(err));
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Disk layer                                                          */
/* ------------------------------------------------------------------ */

function writeDisk(uid: string, info: ThumbInfo) {
  const record: CachedInfo = { ...info, at: Date.now() };
  AsyncStorage.setItem(diskKey(uid), JSON.stringify(record)).catch(() => {});
}

async function readDisk(uid: string): Promise<ThumbInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(diskKey(uid));
    if (!raw) return null;

    const record = JSON.parse(raw) as CachedInfo;
    if (Date.now() - record.at > INFO_TTL_MS) return null;

    return { avatar: record.avatar, photoThumbPath: record.photoThumbPath };
  } catch {
    return null;
  }
}

function infoForUid(uid: string): Promise<ThumbInfo> {
  const hit = memory.get(uid);
  if (hit) return hit;

  const request = (async () => {
    const cached = await readDisk(uid);
    if (cached) return cached;
    return enqueue(uid);
  })().catch((err) => {
    memory.delete(uid);
    throw err;
  });

  memory.set(uid, request);
  return request;
}

/* ------------------------------------------------------------------ */
/* Public API — unchanged signatures                                   */
/* ------------------------------------------------------------------ */

/** Drop cached info for a user — call after they change their own avatar. */
export function invalidateAvatar(uid: string) {
  memory.delete(uid);
  AsyncStorage.removeItem(diskKey(uid)).catch(() => {});
}

/** Also forget the resolved URL — use when the thumb file itself changed. */
export async function invalidateAvatarPhoto(uid: string, path?: string) {
  invalidateAvatar(uid);
  if (path) await invalidateStorageUrl(path);
}

/**
 * Resolve a thumb URL for a user, or null if they have no photo avatar
 * (drawn avatar, or reverted from one) — the caller falls back to initials.
 *
 * @param hint  If you already have {avatar, photoThumbPath} loaded — e.g.
 *              from your friends subcollection — pass it to skip the
 *              user-doc read entirely. Trades a read for possible staleness;
 *              omit it when you want always-fresh.
 */
export async function getAvatarThumbUrl(
  uid: string,
  hint?: ThumbInfo,
): Promise<string | null> {
  const info = hint ?? (await infoForUid(uid));
  if (info.avatar !== "photo" || !info.photoThumbPath) return null;
  return resolveStorageUrl(info.photoThumbPath);
}
