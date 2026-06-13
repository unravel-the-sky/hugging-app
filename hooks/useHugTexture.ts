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
export function useHugTexture(photoUri?: string): LoadedTexture | null {
  const [loaded, setLoaded] = useState<LoadedTexture | null>(null);

  useEffect(() => {
    if (!photoUri) {
      setLoaded(null);
      return;
    }
    let cancelled = false;
    let tex: THREE.Texture | null = null;

    (async () => {
      try {
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
      }
    })();

    return () => {
      cancelled = true;
      tex?.dispose();
    };
  }, [photoUri]);

  return loaded;
}
