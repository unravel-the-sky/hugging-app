import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { colors, shadow } from "@/components/ui/squish/theme";
import { fontFamilyFor, Overlay } from "@/constants/postcardEditorConstants";

type Props = {
  overlay: Overlay;
  selected: boolean;
  onTap: (overlay: Overlay) => void;
  /** Tap landed on the canvas away from this overlay: drop the selection. */
  onDeselect: () => void;
  onChange: (
    id: string,
    next: { x: number; y: number; scale: number; rotation: number },
  ) => void;
  onDelete: (id: string) => void;
};

const clampW = (v: number, lo: number, hi: number) => {
  "worklet";
  return Math.min(Math.max(v, lo), hi);
};

export default function DraggableOverlay({
  overlay,
  selected,
  onTap,
  onDeselect,
  onChange,
  onDelete,
}: Props) {
  const tx = useSharedValue(overlay.x);
  const ty = useSharedValue(overlay.y);
  const scale = useSharedValue(overlay.scale);
  const rot = useSharedValue(overlay.rotation);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startRot = useSharedValue(0);

  const commit = () =>
    onChange(overlay.id, {
      x: tx.value,
      y: ty.value,
      scale: scale.value,
      rotation: rot.value,
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
    })
    .onEnd(() => runOnJS(commit)());

  // Built by factory rather than declared once: a gesture instance can only be
  // attached to a single detector, and pinch/rotate run on two of them — the
  // text box itself and the full-canvas surface below.
  const makePinch = () =>
    Gesture.Pinch()
      .onStart(() => {
        startScale.value = scale.value;
      })
      .onUpdate((e) => {
        scale.value = clampW(startScale.value * e.scale, 0.4, 6);
      })
      .onEnd(() => runOnJS(commit)());

  const makeRotation = () =>
    Gesture.Rotation()
      .onStart(() => {
        startRot.value = rot.value;
      })
      .onUpdate((e) => {
        rot.value = startRot.value + e.rotation;
      })
      .onEnd(() => runOnJS(commit)());

  const pinch = makePinch();
  const rotation = makeRotation();

  const deleteTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => runOnJS(onDelete)(overlay.id));

  const tap = Gesture.Tap()
    .maxDuration(250)
    .requireExternalGestureToFail(deleteTap)
    .onEnd(() => runOnJS(onTap)(overlay));

  const gesture = Gesture.Race(tap, Gesture.Simultaneous(pan, pinch, rotation));

  // Pinching a short word used to mean landing both fingers inside a box the
  // size of the word — "yes" at the default size is barely 70pt wide, so the
  // gesture only started from an awkward near-pinch. While this overlay is
  // selected the whole canvas drives it instead, so the fingers can start as
  // far apart as the postcard allows. A single tap on that same surface is
  // what drops the selection and gives the canvas back to the photo.
  const surfaceTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => runOnJS(onDeselect)());

  const surfaceGesture = Gesture.Simultaneous(
    surfaceTap,
    makePinch(),
    makeRotation(),
  );

  const boxStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotateZ: `${rot.value}rad` },
      { scale: scale.value },
    ],
  }));

  // Keep chrome (delete button) a constant on-screen size.
  const chromeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 / scale.value }],
  }));

  return (
    <View style={styles.fill} pointerEvents="box-none">
      {selected && (
        <GestureDetector gesture={surfaceGesture}>
          <View style={styles.fill} />
        </GestureDetector>
      )}

      {/* above the surface, so taps on the text and the × still reach them */}
      <View style={styles.center} pointerEvents="box-none">
        <GestureDetector gesture={gesture}>
          <Animated.View style={boxStyle}>
            <View style={selected ? styles.selectedPad : styles.pad}>
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: fontFamilyFor(overlay.fontKey),
                  fontSize: overlay.size,
                  color: overlay.color,
                  // Script/italic faces (Caveat) draw ink past the advance
                  // width and outside the em box, so the view RN measures is
                  // narrower/shorter than the glyphs. Pad by a fraction of the
                  // font size so ascenders, descenders and the trailing
                  // letter's overhang stay inside the box at any size. -- says claude :)
                  lineHeight: overlay.size * 1.45,
                  paddingHorizontal: overlay.size * 0.18,
                  paddingVertical: overlay.size * 0.12,
                  includeFontPadding: true,
                  textAlignVertical: "center",
                  ...shadow,
                  shadowOpacity: 0.05,
                }}
              >
                {overlay.text}
              </Text>

              {selected && (
                <Animated.View style={[styles.deleteWrap, chromeStyle]}>
                  <GestureDetector gesture={deleteTap}>
                    <Animated.View style={styles.delete} hitSlop={12}>
                      <Ionicons name="close" size={16} color={colors.blush} />
                    </Animated.View>
                  </GestureDetector>
                </Animated.View>
              )}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  pad: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    width: "auto",
    overflow: "visible",
  },
  selectedPad: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.mint,
    borderStyle: "dashed",
    borderRadius: 10,
    width: "auto",
    overflow: "visible",
  },
  deleteWrap: {
    position: "absolute",
    top: -14,
    right: -14,
  },
  delete: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
