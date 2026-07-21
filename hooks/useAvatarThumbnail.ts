import { getAvatarThumbUrl, ThumbInfo } from "@/lib/avatarThumbnail";
import { useEffect, useState } from "react";

export function useAvatarThumb(
  uid?: string,
  hint?: ThumbInfo,
): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    if (!uid) {
      setUrl(undefined);
      return;
    }
    getAvatarThumbUrl(uid, hint)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(undefined));
    return () => {
      alive = false;
    };
  }, [uid, hint?.avatar, hint?.photoThumbPath]);

  return url;
}
