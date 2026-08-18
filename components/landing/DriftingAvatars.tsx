import { avatarColors, colors } from "@/components/ui/squish/theme";
import { BlurTargetView, BlurView, type BlurTint } from "expo-blur";
import { useMemo, useRef } from "react";
import { StyleSheet, useWindowDimensions, type View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

/** Theme colors the avatars cycle through — one per accent. */
const PALETTE = [
  avatarColors.primary,
  colors.blush,
  colors.peach,
  colors.mint,
  colors.butter,
  colors.sky,
  colors.lilac,
];

type Blob = {
  color: string;
  /** Home position — the blob drifts around this point, never away from it. */
  x: number;
  y: number;
  r: number;
  ampX: number;
  ampY: number;
  /** rad/s — deliberately under 0.2 so the motion reads as breathing, not floating. */
  speedX: number;
  speedY: number;
  phaseX: number;
  phaseY: number;
  opacity: number;
};

function makeBlobs(w: number, h: number, count: number): Blob[] {
  return Array.from({ length: count }, (_, i) => ({
    color: PALETTE[i % PALETTE.length],
    x: w * (0.12 + Math.random() * 0.76),
    y: h * (0.08 + Math.random() * 0.84),
    r: Math.min(w, h) * (0.13 + Math.random() * 0.12),
    ampX: w * (0.07 + Math.random() * 0.13),
    ampY: h * (0.05 + Math.random() * 0.1),
    speedX: 0.2 + Math.random() * 0.11,
    speedY: 0.32 + Math.random() * 0.1,
    phaseX: Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
    opacity: 0.55 + Math.random() * 0.25,
  }));
}

function DriftingBlob({
  blob,
  clock,
}: {
  blob: Blob;
  clock: SharedValue<number>;
}) {
  // Transform-only animation, so each frame stays on the UI thread and never
  // triggers layout — the blur pane above just re-samples what it sees.
  const drift = useAnimatedStyle(() => {
    const t = clock.value;
    return {
      transform: [
        { translateX: blob.ampX * Math.sin(t * blob.speedX + blob.phaseX) },
        { translateY: blob.ampY * Math.cos(t * blob.speedY + blob.phaseY) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: blob.x - blob.r,
          top: blob.y - blob.r,
          width: blob.r * 2,
          height: blob.r * 2,
          borderRadius: blob.r,
          backgroundColor: blob.color,
          opacity: blob.opacity,
        },
        drift,
      ]}
    />
  );
}

export function DriftingAvatars({
  count = 4,
  intensity = 65,
  tint = "light",
  /**
   * Android only. 'dimezisBlurView' blurs on every version but costs
   * performance on SDK 30 and below; 'dimezisBlurViewSdk31Plus' is cheaper
   * but renders no blur at all on Android 11 and older.
   */
  blurMethod = "dimezisBlurView",
}: {
  count?: number;
  intensity?: number;
  tint?: BlurTint;
  blurMethod?: "none" | "dimezisBlurView" | "dimezisBlurViewSdk31Plus";
}) {
  const { width, height } = useWindowDimensions();
  const blurTarget = useRef<View>(null);

  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    clock.value = (frame.timeSinceFirstFrame ?? 0) / 1000;
  });

  // Re-rolled only when the screen resizes (rotation), so the layout is stable
  // across re-renders and the hook order below never changes.
  const blobs = useMemo(
    () => makeBlobs(width, height, count),
    [width, height, count],
  );

  return (
    <>
      {/* Android needs the blurred content wrapped so BlurView can sample it. */}
      <BlurTargetView
        ref={blurTarget}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {blobs.map((blob, i) => (
          <DriftingBlob key={i} blob={blob} clock={clock} />
        ))}
      </BlurTargetView>

      {/* Full-screen frosted pane. Anything rendered after this stays sharp. */}
      <BlurView
        style={StyleSheet.absoluteFill}
        blurTarget={blurTarget}
        blurMethod={blurMethod}
        intensity={intensity}
        tint={tint}
        pointerEvents="none"
      />
    </>
  );
}

export default DriftingAvatars;
