import { getDownloadURL, getStorage, ref } from "firebase/storage";
import { useEffect, useState } from "react";

export const useGetDownloadUrl = (photoUri: string | undefined) => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!photoUri) return;
    let alive = true;
    getDownloadURL(ref(getStorage(), photoUri))
      .then((u) => alive && setDownloadUrl(u))
      .catch((e) => {
        console.error("error happened while fetching img: ", e);
        return alive && setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [photoUri]);

  return {
    downloadUrl,
    failed,
  };
};
