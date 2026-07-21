import { db, storage } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";

export type ThumbInfo = { avatar?: string | null; photoThumbPath?: string };

const urlCache = new Map<string, Promise<string>>();

function urlForPath(path: string): Promise<string> {
  let p = urlCache.get(path);
  if (!p) {
    p = getDownloadURL(ref(storage, path)).catch((e) => {
      urlCache.delete(path); // allow a later retry
      throw e;
    });
    urlCache.set(path, p);
  }
  return p;
}

const infoCache = new Map<string, Promise<ThumbInfo>>();

function infoForUid(uid: string): Promise<ThumbInfo> {
  let p = infoCache.get(uid);
  if (!p) {
    p = getDoc(doc(db, "users", uid))
      .then((snap) => {
        const d = snap.data() as ThumbInfo | undefined;
        return { avatar: d?.avatar, photoThumbPath: d?.photoThumbPath };
      })
      .catch((e) => {
        infoCache.delete(uid);
        throw e;
      });
    infoCache.set(uid, p);
  }
  return p;
}

/** Drop cached info for a user — call after they change their own avatar. */
export function invalidateAvatar(uid: string) {
  infoCache.delete(uid);
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
  return urlForPath(info.photoThumbPath);
}
