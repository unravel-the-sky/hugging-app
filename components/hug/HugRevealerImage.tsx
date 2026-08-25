import { Image } from "expo-image";
import { use, useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { TabBarContext } from "@/context/TabBarContext";
import { useGetDownloadUrl } from "@/hooks/useGetDownloadUrl";
import { useTiltNew } from "@/hooks/useTilt";
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { useFocusEffect } from "expo-router";
import { scheduleOnRN } from "react-native-worklets";
import { contrastingTint } from "@/lib/util";
import { colors, font, spacing } from "../ui/squish";
import Toast from "../ui/squish/Toast";
import { HeartsGridSkia } from "./HeartGridSkia";

// ── tuning ───────────────────────────────────────────────────────────
// degrees-per-pixel, converted from the three.js version's radians:
//   DRAG_SENS 0.004 rad/px → 0.23 °/px
//   FLIP_SENS 0.0075 rad/px → 0.43 °/px
const MAX_TILT = 10; // ° of free tilt in every direction (was MAX_DRAG)
const DRAG_SENS = 0.23;
const FLIP_SENS = 0.43;
const HINT_PEEK = -11; // ° — matches -Math.PI * 0.06
const HINT_DUR = 1150; // ms of one peek
const HINT_PERIOD = 2800; // ms between peeks
const PERSPECTIVE = 1200; // lower = more dramatic foreshortening
const SPRING = { damping: 18, stiffness: 140, mass: 0.9 };

const BORDER = 6; // the cream postcard border FACE_INSET never gave you
const INK = "#270865";
const PAPER = "#FFFFFF";

/** Card shape before the photo reports its own, and the fallback if it never does. */
const PHOTO_RATIO = 1038 / 1224; // 0.848
/** Keeps a panorama or a very tall photo from turning the card into a strip. */
const MIN_RATIO = 0.5;
const MAX_RATIO = 1.9;

const clamp = (v: number, lo: number, hi: number) => {
  "worklet";
  return Math.max(lo, Math.min(hi, v));
};

/** Room the sender header needs above the card. */
const TOP_INSET = 96;
/** Room below the card when nothing but the hug-back button sits there. */
const DEFAULT_BOTTOM_INSET = 150;
/** Breathing room so the card never touches either inset. */
const SLACK = 74;

interface HugRevealerImageProps {
  imageUri?: string;
  message?: string;
  aspect?: number; // width / height, from the hug doc
  loading?: boolean;
  /** hex the sender picked in the editor; falls back to the stock lavender */
  backgroundColor?: string;
  /**
   * Space to keep clear below the card. The parent owns everything down there
   * — the thread and the button — so it decides how much room the card gives
   * up; a hug with hug-backs to show wants the card sitting higher.
   */
  bottomInset?: number;
  /**
   * Where the card sits in the space left over after the insets.
   *
   * "center" splits that slack above and below the card. "bottom" gives it
   * all to the top, dropping the card onto the inset — which is what you want
   * when a thread starts right below it, so the two read as one column
   * instead of being pushed apart by half the slack.
   */
  cardAnchor?: "center" | "bottom";
}

/**
 * The card itself, and nothing else. The close / hug-back buttons live with the
 * hug-back note in the parent overlay, which owns everything below the card.
 */
export default function HugRevealerImage({
  imageUri,
  message,
  aspect = 3 / 4,
  backgroundColor,
  bottomInset = DEFAULT_BOTTOM_INSET,
  cardAnchor = "center",
}: HugRevealerImageProps) {
  // The sender's backdrop carries over, and the hearts take the far end of it
  // so they stay legible whichever way the photo leaned.
  const backdrop = backgroundColor || colors.mistBg;
  const heartColor = backgroundColor
    ? contrastingTint(backgroundColor)
    : undefined;
  const { setIsTabBarHidden } = use(TabBarContext);

  useFocusEffect(() => {
    setIsTabBarHidden(true);
    return () => setIsTabBarHidden(false);
  });

  const hasImage = !!imageUri;
  const canFlip = hasImage && !!message && message.trim() !== "";

  const flip = useSharedValue(0); // 0 = front, -180 = back
  const tilt = useSharedValue(0); // vertical tilt, ±MAX_TILT
  const hint = useSharedValue(0); // idle peek, always looping
  const hintGain = useSharedValue(0); // 0..1 fade for the peek
  const flippedOnce = useSharedValue(false);
  const startFlip = useSharedValue(0);
  const startTilt = useSharedValue(0);

  const { ref: tiltRef, x: tiltX, y: tiltY } = useTiltNew();

  const [imgLoaded, setImgLoaded] = useState(false);
  /**
   * The photo's own width/height, once it loads. The card was a fixed portrait
   * regardless of what was inside it, so any photo that wasn't 1038×1224 got
   * letterboxed — a landscape shot left a band of blank paper under it. The
   * card now takes the photo's shape, so `contain` has nothing to letterbox.
   *
   * Measured rather than stored on the hug: it works for hugs sent before
   * this change too, with no field to backfill.
   */
  const [photoRatio, setPhotoRatio] = useState<number | null>(null);

  // opacity swap instead of backfaceVisibility — Android stays predictable
  const showBack = useDerivedValue(() => flip.value < -90);

  const spin = useDerivedValue(() => flip.value + hint.value * hintGain.value);

  const { downloadUrl, failed } = useGetDownloadUrl(imageUri);

  // the peek loop runs forever; hintGain decides whether it's visible.
  // cheaper than cancelling/restarting, and it eases in and out for free.
  useEffect(() => {
    hint.value = withRepeat(
      withSequence(
        withTiming(HINT_PEEK, {
          duration: HINT_DUR / 2,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration: HINT_DUR / 2,
          easing: Easing.inOut(Easing.quad),
        }),
        withDelay(HINT_PERIOD - HINT_DUR, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [hint]);

  useEffect(() => {
    hintGain.value = withDelay(
      600,
      withTiming(canFlip ? 1 : 0, { duration: 300 }),
    );
  }, [canFlip, hintGain]);

  const saveImage = async () => {
    if (!downloadUrl) return;

    let file: File | undefined;
    try {
      if (!perm?.granted && !(await requestPerm()).granted) {
        Alert.alert(
          "Photos access needed",
          "Enable it in Settings to save hugs.",
        );
        return;
      }

      const target = new File(Paths.cache, `hug-${Date.now()}.jpg`);
      file = await File.downloadFileAsync(downloadUrl, target);
      await MediaLibrary.saveToLibraryAsync(file.uri);
      setToast({ visible: true, message: "Saved to your photos" });
    } catch (err) {
      console.error("could not save, error: ", err);
      Alert.alert("Couldn't save", "Try again in a moment.");
    } finally {
      file?.delete();
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .activeOffsetY([-12, 12])
    .onBegin(() => {
      startFlip.value = flip.value;
      startTilt.value = tilt.value;
      hintGain.value = withTiming(0, { duration: 120 });
    })
    .onUpdate((e) => {
      tilt.value = clamp(
        startTilt.value - e.translationY * DRAG_SENS,
        -MAX_TILT,
        MAX_TILT,
      );

      // drag left toward -180 to flip; only a small tilt to the right
      flip.value = canFlip
        ? clamp(startFlip.value + e.translationX * FLIP_SENS, -180, MAX_TILT)
        : clamp(
            startFlip.value + e.translationX * DRAG_SENS,
            -MAX_TILT,
            MAX_TILT,
          );
    })
    .onEnd((e) => {
      tilt.value = withSpring(0, SPRING);

      if (!canFlip) {
        flip.value = withSpring(0, SPRING);
        return;
      }

      const flung = Math.abs(e.velocityX) > 500;
      const toBack = flung ? e.velocityX < 0 : flip.value < -90;
      flip.value = withSpring(toBack ? -180 : 0, SPRING);

      if (toBack) {
        flippedOnce.value = true; // hint retires forever
        hintGain.value = withTiming(0, { duration: 120 });
      } else if (!flippedOnce.value) {
        hintGain.value = withDelay(500, withTiming(1, { duration: 300 }));
      }
    });

  // tap to flip — not in the three.js version, but it costs nothing here
  const tap = Gesture.Tap().onEnd(() => {
    if (!canFlip) return;
    const toBack = flip.value > -90;
    flip.value = withSpring(toBack ? -180 : 0, SPRING);
    if (toBack) {
      flippedOnce.value = true;
      hintGain.value = withTiming(0, { duration: 120 });
    }
  });

  const longPress = Gesture.LongPress()
    .minDuration(450)
    .onStart(() => {
      if (showBack.value) return; // no image on the back
      scheduleOnRN(saveImage);
    });

  const gesture = Gesture.Exclusive(pan, longPress, tap);

  const frontStyle = useAnimatedStyle(() => ({
    opacity: showBack.value ? 0 : 1,
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${tilt.value}deg` },
      { rotateY: `${spin.value}deg` },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: showBack.value ? 1 : 0,
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${tilt.value}deg` },
      { rotateY: `${spin.value + 180}deg` },
    ],
  }));

  const { width: winW, height: winH } = useWindowDimensions();
  const ratio = photoRatio ?? PHOTO_RATIO;
  // The photo box; BORDER is added back on for the paper frame around it.
  const available = winH - TOP_INSET - bottomInset - SLACK;
  const photoW = Math.min(
    winW - 64 - BORDER * 2,
    (available - BORDER * 2) * ratio,
  );
  const cardW = photoW + BORDER * 2;
  const cardH = photoW / ratio + BORDER * 2;

  const [perm, requestPerm] = MediaLibrary.usePermissions({ writeOnly: true });
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  return (
    <View style={[styles.root, { backgroundColor: backdrop }]}>
      <HeartsGridSkia
        tiltX={tiltX}
        tiltY={tiltY}
        unit={cardH * 0.25}
        color={heartColor}
      />

      {hasImage && (
        <View
          style={[
            styles.stage,
            {
              paddingBottom: bottomInset + spacing.md,
              justifyContent: cardAnchor === "bottom" ? "flex-end" : "center",
            },
          ]}
          pointerEvents="box-none"
        >
          <GestureDetector gesture={gesture}>
            <View style={[styles.flipWrap, { width: cardW, height: cardH }]}>
              <Animated.View style={[styles.face, frontStyle]}>
                <Image
                  source={downloadUrl}
                  style={styles.photo}
                  contentFit="contain"
                  onLoad={(e) => {
                    setImgLoaded(true);
                    const { width, height } = e.source ?? {};
                    if (width && height) {
                      setPhotoRatio(
                        clamp(width / height, MIN_RATIO, MAX_RATIO),
                      );
                    }
                  }}
                  transition={200}
                  cachePolicy="memory-disk"
                />
              </Animated.View>

              {imgLoaded && (
                <Animated.View style={[styles.face, styles.back, backStyle]}>
                  <Text style={styles.backNote}>{message}</Text>
                </Animated.View>
              )}
            </View>
          </GestureDetector>
        </View>
      )}

      {!hasImage && (
        <View
          style={[
            styles.stage,
            {
              paddingBottom: bottomInset,
              justifyContent: "center",
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.noteOnly}>
            <Text style={styles.noteOnlyText}>
              {message?.trim() ? message : "Sending you a hug 💜"}
            </Text>
          </View>
        </View>
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.mistBg,
  },
  stage: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    // Leaves room for the sender header above and the hug-back button below,
    // so the card centres in what's left rather than under the header.
    paddingTop: 96,
    paddingBottom: 180,
  },
  flipWrap: {
    // width: "100%",
  },
  face: {
    ...StyleSheet.absoluteFill,
    // The paper frame. Without this the photo filled the card edge to edge and
    // BORDER only inflated the card, so the "border" you saw was whatever
    // letterboxing happened to be left over.
    padding: BORDER,
    backgroundColor: PAPER,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  photo: {
    flex: 1,
  },
  back: {
    alignItems: "center",
    justifyContent: "center",
  },
  backNote: {
    fontFamily: font.displayBold,
    fontSize: 22,
    lineHeight: 30,
    color: INK,
    textAlign: "center",
  },
  noteOnly: {
    backgroundColor: PAPER,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: 340,
    transform: [{ rotate: "-1.5deg" }],
  },
  noteOnlyText: {
    fontFamily: "Caveat_400Regular",
    fontSize: 26,
    lineHeight: 32,
    color: "#4A3A6B",
    textAlign: "center",
  },
  loadingWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { fontFamily: font.displayBold, fontSize: 24, color: "#4A3A6B" },
});
