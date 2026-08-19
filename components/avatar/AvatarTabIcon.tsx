import { colors } from "@/components/ui/squish/theme";
import { AvatarType, User } from "@/lib/createUser";
import { Image as ExpoImage } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, PixelRatio, StyleSheet, View } from "react-native";
import type { ImageURISource } from "react-native";
import { captureRef } from "react-native-view-shot";

const MaleFace = require("@/assets/images/hugFaceMaleImg.png");
const FemaleFace = require("@/assets/images/hugFaceFemaleImg.png");

// UIKit draws a tab bar item at the image's *natural* point size — it will not
// scale it down for us. So we lay the avatar out at exactly the icon size and
// let the capture happen at the device's pixel ratio, then tell the image
// loader that scale so the pixels come back as 28 points, not 84.
const SIZE = 28;

/**
 * iOS tab bar items take an *image*, not a view — no borderRadius, no children.
 * So to use the user's avatar as a tab icon we render it off-screen, snapshot
 * the circular result to a PNG, and hand that file to the tab bar.
 *
 * The snapshot is regenerated whenever the avatar identity changes (type or
 * photo URL). It lives in the temp dir for the life of the process, which is
 * all the tab bar needs.
 */
export function useAvatarTabIcon(
  user: Pick<User, "avatar" | "photoURL" | "photoThumbURL"> | undefined,
) {
  const [source, setSource] = useState<ImageURISource>();
  const viewRef = useRef<View>(null);

  const type: AvatarType = user?.avatar ?? "male";
  const photo = user?.photoThumbURL ?? user?.photoURL;
  // identity of what we're drawing — a change here means a fresh snapshot
  const key = `${type}:${photo ?? ""}`;

  useEffect(() => {
    setSource(undefined);
  }, [key]);

  // Captured only once the underlying image reports loaded, otherwise the
  // snapshot can come back blank (remote photos especially).
  const capture = useCallback(async () => {
    try {
      const file = await captureRef(viewRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      setSource({
        uri: file,
        // point size + scale: without these the loader hands UIKit an
        // 84-point image and the tab bar dwarfs its neighbours
        width: SIZE,
        height: SIZE,
        scale: PixelRatio.get(),
      });
    } catch (err) {
      console.warn("avatar tab icon snapshot failed", err);
    }
  }, []);

  const isPhoto = type === "photo" && !!photo;

  const snapshotView = (
    <View style={styles.offscreen} pointerEvents="none">
      <View ref={viewRef} collapsable={false} style={styles.circle}>
        {isPhoto ? (
          <ExpoImage
            source={{ uri: photo }}
            style={styles.fill}
            contentFit="cover"
            onLoadEnd={capture}
          />
        ) : (
          <View style={[styles.fill, styles.faceBg]}>
            <Image
              source={type === "female" ? FemaleFace : MaleFace}
              style={styles.face}
              resizeMode="contain"
              onLoad={capture}
            />
          </View>
        )}
      </View>
    </View>
  );

  return { source, snapshotView };
}

const styles = StyleSheet.create({
  // parked well off-screen: it has to be laid out and drawn to be captured,
  // so `display: none` / zero size are not options.
  offscreen: { position: "absolute", left: -SIZE * 3, top: -SIZE * 3 },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  fill: { width: SIZE, height: SIZE },
  faceBg: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lilac,
  },
  face: { width: SIZE * 0.86, height: SIZE * 0.86 },
});
