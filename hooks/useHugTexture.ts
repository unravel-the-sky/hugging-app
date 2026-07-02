import { useEffect, useState } from "react";
import * as THREE from "three";

declare const createImageBitmap: (source: Blob) => Promise<{
  width: number;
  height: number;
}>;

export type LoadedTexture = { texture: THREE.Texture; aspect: number };

/**
 * Loads a hug image into a THREE.Texture. Starts as soon as `photoUri` is
 * set — call it from the sealed screen so the texture is ready (or nearly)
 * by the time the user taps "Open it".
 */
export function useHugTexture(photoUri?: string): {
  loaded: LoadedTexture | null;
  loading: boolean;
} {
  const [loaded, setLoaded] = useState<LoadedTexture | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!photoUri) {
      setLoaded(null);
      return;
    }
    let cancelled = false;
    let tex: THREE.Texture | null = null;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(photoUri);
        const blob = await res.blob();
        const bitmap = await createImageBitmap(blob);
        if (cancelled) return;
        tex = new THREE.Texture(bitmap as unknown as TexImageSource);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setLoaded({ texture: tex, aspect: bitmap.width / bitmap.height });
      } catch (err) {
        console.warn("[useHugTexture] load failed", err);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      tex?.dispose();
    };
  }, [photoUri]);

  return { loading, loaded };
}
