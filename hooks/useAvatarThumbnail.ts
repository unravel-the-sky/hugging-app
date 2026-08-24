import {
  getAvatarCacheVersion,
  getAvatarThumbUrl,
  subscribeToAvatarChanges,
  ThumbInfo,
} from "@/lib/avatarThumbnail";
import { useEffect, useState, useSyncExternalStore } from "react";

export function useAvatarThumb(
  uid?: string,
  hint?: ThumbInfo,
): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  // Re-resolves when someone's avatar is invalidated. Without this the effect
  // below only re-runs on a uid change, so an avatar you just changed keeps
  // rendering from the URL this component resolved on mount.
  const cacheVersion = useSyncExternalStore(
    subscribeToAvatarChanges,
    getAvatarCacheVersion,
  );

  useEffect(() => {
    let alive = true;
    if (!uid) {
      setUrl(undefined);
      return;
    }
    getAvatarThumbUrl(uid, hint)
      .then((u) => alive && setUrl(u ?? undefined))
      .catch(() => alive && setUrl(undefined));
    return () => {
      alive = false;
    };
  }, [uid, hint?.avatar, hint?.photoThumbPath, cacheVersion]);

  return url;
}
