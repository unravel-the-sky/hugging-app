import { storage } from "@/lib/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDownloadURL, ref } from "firebase/storage";

/**
 * Every Storage path → download URL resolution in the app should go through
 * here. One choke point means one cache, one place to instrument, and one
 * place to fix when something misbehaves.
 *
 * Two layers:
 *   memory — dedupes concurrent callers within a session (promise, not value)
 *   disk   — survives cold starts, which is where the volume actually comes from
 *
 * IMPORTANT: this assumes a given path always points at the same bytes.
 * Overwriting an object mints a new token and invalidates the old URL, so if
 * `photoThumbPath` is a fixed name like `users/{uid}/thumb.jpg`, a persisted
 * URL will start returning 403 after a re-upload. Either put a timestamp or
 * uuid in the filename at upload time, or call `invalidateStorageUrl` from
 * your image component's onError.
 */

const diskKey = (path: string) => `storageUrl:${path}`;

const memory = new Map<string, Promise<string>>();

/** Bumped only when we actually hit the network. Use it to verify the fix. */
let networkResolves = 0;

export const storageUrlStats = () => ({
  networkResolves,
  inMemory: memory.size,
});

export function resolveStorageUrl(path: string): Promise<string> {
  const hit = memory.get(path);
  if (hit) return hit;

  const request = (async () => {
    const cached = await AsyncStorage.getItem(diskKey(path)).catch(() => null);
    if (cached) return cached;

    networkResolves += 1;
    const url = await getDownloadURL(ref(storage, path));

    // Fire and forget — a failed write just costs one lookup next launch.
    AsyncStorage.setItem(diskKey(path), url).catch(() => {});
    return url;
  })().catch((err) => {
    memory.delete(path);
    throw err;
  });

  memory.set(path, request);
  return request;
}

/** Call after overwriting an object, or from an image's onError handler. */
export async function invalidateStorageUrl(path: string) {
  memory.delete(path);
  await AsyncStorage.removeItem(diskKey(path)).catch(() => {});
}

/**
 * Warm a batch of paths from disk in one read, then resolve whatever's left.
 * Worth calling when you know a screen is about to render many images.
 */
export async function prewarmStorageUrls(paths: string[]) {
  const wanted = [...new Set(paths.filter(Boolean))].filter(
    (path) => !memory.has(path),
  );
  if (wanted.length === 0) return;

  const entries = await AsyncStorage.multiGet(wanted.map(diskKey)).catch(
    () => [] as [string, string | null][],
  );

  const cached = new Map(
    entries.map(([key, value]) => [key.replace("storageUrl:", ""), value]),
  );

  for (const path of wanted) {
    const url = cached.get(path);
    if (url) memory.set(path, Promise.resolve(url));
    else resolveStorageUrl(path).catch(() => {});
  }
}
