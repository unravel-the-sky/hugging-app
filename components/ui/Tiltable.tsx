import { ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

// Same feel as the postcard in HugRevealerImage: degrees-per-pixel drag, a
// hard stop on how far it can lean, and a spring back to flat on release.
const MAX_TILT = 14; // ° of lean in every direction
const DRAG_SENS = 0.23; // ° per pixel dragged
const SPRING = { damping: 18, stiffness: 140, mass: 0.9 };

// The lean is faked with skew + scale rather than a real rotateX/rotateY over a
// perspective, and that is deliberate. `perspective` sets m34 on the layer's
// CATransform3D, which makes the matrix non-affine, and CoreAnimation cannot
// render a non-affine layer through a snapshot pass. The full-screen BlurView
// in DriftingAvatars re-samples the layer tree every frame to build its
// backdrop, so a real 3D transform anywhere under it corrupts the blur — and
// on Android the same non-affine matrix came back as a clipped SVG. Skew and
// scale are affine, so both sampling passes handle them.

/** ° of shear per ° of lean — the shear is what reads as a corner coming forward. */
const SHEAR = 0.25;
/** How much the face shrinks along the leaning axis at full tilt. */
const FORESHORTEN = 0.06;
/** px of drift at full tilt, so the whole thing pushes rather than only shearing. */
const PARALLAX = 6;

const clamp = (v: number, lo: number, hi: number) => {
  "worklet";
  return Math.max(lo, Math.min(hi, v));
};

interface TiltableProps {
  children: ReactNode;
  /** ° of lean allowed in every direction. */
  maxTilt?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps its children in a card you can push around in 3D space with a drag.
 * It has no back face — unlike the postcard there is nothing to flip to — so
 * both axes just lean within maxTilt and spring flat again when you let go.
 */
export function Tiltable({
  children,
  maxTilt = MAX_TILT,
  style,
}: TiltableProps) {
  const tiltX = useSharedValue(0); // lean from vertical drags
  const tiltY = useSharedValue(0); // lean from horizontal drags
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = tiltX.value;
      startY.value = tiltY.value;
    })
    .onUpdate((e) => {
      tiltX.value = clamp(
        startX.value - e.translationY * DRAG_SENS,
        -maxTilt,
        maxTilt,
      );
      tiltY.value = clamp(
        startY.value + e.translationX * DRAG_SENS,
        -maxTilt,
        maxTilt,
      );
    })
    .onFinalize(() => {
      tiltX.value = withSpring(0, SPRING);
      tiltY.value = withSpring(0, SPRING);
    });

  const animatedStyle = useAnimatedStyle(() => {
    // Normalised lean, -1..1 on each axis, so the constants above read as
    // "at full tilt" regardless of what maxTilt is set to.
    const nx = tiltX.value / maxTilt;
    const ny = tiltY.value / maxTilt;

    return {
      transform: [
        { translateX: ny * PARALLAX },
        { translateY: -nx * PARALLAX },
        { skewX: `${tiltY.value * SHEAR}deg` },
        { skewY: `${tiltX.value * SHEAR}deg` },
        { scaleX: 1 - Math.abs(ny) * FORESHORTEN },
        { scaleY: 1 - Math.abs(nx) * FORESHORTEN },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}
