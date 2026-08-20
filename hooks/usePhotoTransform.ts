import { Transforms3d } from "@shopify/react-native-skia";
import { Gesture } from "react-native-gesture-handler";
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";

const MAX_SCALE = 6;

/**
 * Pan / pinch / rotate for the photo sitting inside the polaroid window.
 *
 * The photo is always kept covering the window: `scale` never drops below the
 * amount needed for the rotated photo to hide all four corners, and the pan is
 * clamped to whatever slack is left over.
 *
 * `windowWidth`/`windowHeight` is the hole in the polaroid; `photoWidth`/
 * `photoHeight` is the size the photo is actually drawn at, which is bigger on
 * one axis (see `coverSize`). That difference is the slack the user pans
 * across — with the two equal there is nothing to drag to at scale 1.
 */
export default function usePhotoTransform({
  windowWidth,
  windowHeight,
  photoWidth,
  photoHeight,
  onTap,
}: {
  windowWidth: number;
  windowHeight: number;
  photoWidth: number;
  photoHeight: number;
  onTap?: () => void;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const rot = useSharedValue(0);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startRot = useSharedValue(0);

  /**
   * Pull scale/translation back into the range where the photo still covers
   * the window. Measured in the photo's own frame: the window, seen from
   * there, spans (w·|cos| + h·|sin|) × (w·|sin| + h·|cos|), so the scaled
   * photo has to be at least that big and the leftover is the pan budget.
   */
  const clampToCover = () => {
    "worklet";
    const c = Math.cos(rot.value);
    const s = Math.sin(rot.value);
    const ac = Math.abs(c);
    const as = Math.abs(s);

    const spanX = windowWidth * ac + windowHeight * as;
    const spanY = windowWidth * as + windowHeight * ac;

    const min = Math.max(spanX / photoWidth, spanY / photoHeight);
    scale.value = Math.min(Math.max(scale.value, min), Math.max(MAX_SCALE, min));

    const limX = Math.max(0, (scale.value * photoWidth - spanX) / 2);
    const limY = Math.max(0, (scale.value * photoHeight - spanY) / 2);

    // offset expressed in the photo's frame
    const localX = c * tx.value + s * ty.value;
    const localY = -s * tx.value + c * ty.value;

    const clampedX = Math.min(Math.max(localX, -limX), limX);
    const clampedY = Math.min(Math.max(localY, -limY), limY);

    tx.value = c * clampedX - s * clampedY;
    ty.value = s * clampedX + c * clampedY;
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
      clampToCover();
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = startScale.value * e.scale;
      clampToCover();
    });

  const rotation = Gesture.Rotation()
    .onStart(() => {
      startRot.value = rot.value;
    })
    .onUpdate((e) => {
      rot.value = startRot.value + e.rotation;
      clampToCover();
    });

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      if (onTap) runOnJS(onTap)();
    });

  const gesture = Gesture.Race(
    tap,
    Gesture.Simultaneous(pan, pinch, rotation),
  );

  // Skia applies these left to right, around the origin the Group is given.
  const transform = useDerivedValue<Transforms3d>(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { rotate: rot.value },
    { scale: scale.value },
  ]);

  return { gesture, transform };
}
