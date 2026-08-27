import { useEffect, useState } from "react";
import { getColors } from "react-native-image-colors";

export type ImagePalette = {
  colorOne: { value: string; name: string };
  colorTwo: { value: string; name: string };
  colorThree: { value: string; name: string };
  colorFour: { value: string; name: string };
  rawResult: string;
};

/**
 * Pull four representative colours out of an image.
 *
 * Pass `null` to skip the work entirely — callers that only sometimes need a
 * palette still have to call the hook, and extracting colours for a photo
 * nobody is going to tint is a decode we can't afford on the capture path.
 *
 * `ready` says the extraction has settled (with or without a result), which is
 * what a caller gates a screen transition on. `colors` alone can't say that:
 * it is undefined both before the work starts and after it fails.
 */
export const useImageColors = (imageUrl: string | null | undefined) => {
  const [colors, setColors] = useState<ImagePalette | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setColors(undefined);
      setLoading(false);
      setReady(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setReady(false);

    (async () => {
      try {
        const result = await getColors(imageUrl, {
          fallback: "#228B22",
          pixelSpacing: 5,
        });
        if (cancelled) return;

        switch (result.platform) {
          case "android":
          case "web":
            setColors({
              colorOne: { value: result.lightVibrant, name: "lightVibrant" },
              colorTwo: { value: result.dominant, name: "dominant" },
              colorThree: { value: result.vibrant, name: "vibrant" },
              colorFour: { value: result.darkVibrant, name: "darkVibrant" },
              rawResult: JSON.stringify(result),
            });
            break;
          case "ios":
            setColors({
              colorOne: { value: result.background, name: "background" },
              colorTwo: { value: result.detail, name: "detail" },
              colorThree: { value: result.primary, name: "primary" },
              colorFour: { value: result.secondary, name: "secondary" },
              rawResult: JSON.stringify(result),
            });
            break;
          default:
            setColors(undefined);
        }
      } catch (err) {
        // A palette is a nicety. Losing it must not strand the caller on a
        // screen that never finishes loading, so we still mark it settled.
        console.error("Colour extraction failed for", imageUrl, err);
        if (!cancelled) setColors(undefined);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return { colors, loading, ready };
};
