import { getAvatarThumbUrl, ThumbInfo } from "@/lib/avatarThumbnail";
import { useEffect, useState } from "react";

export function useAvatarThumb(uid?: string, hint?: ThumbInfo): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!uid) {
      setUrl(null);
      return;
    }
    getAvatarThumbUrl(uid, hint)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [uid, hint?.avatar, hint?.photoThumbPath]);

  return url;
}
