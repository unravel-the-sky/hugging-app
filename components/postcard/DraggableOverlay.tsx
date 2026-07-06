// components/postcard/DraggableOverlay.tsx
//
// Draggable / pinchable / rotatable text overlay. Committed values live in
// parent state; shared values drive the live transform and write back on
// gesture end so they survive re-renders (and are correct at capture time).
//
// Tap selects (shows dashed box + delete). Tapping again opens the editor
// (handled by the parent via onTap).

import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { colors } from "@/components/ui/squish/theme";
import { fontFamilyFor, Overlay } from "@/constants/postcardEditorConstants";

type Props = {
  overlay: Overlay;
  selected: boolean;
  onTap: (overlay: Overlay) => void;
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

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clampW(startScale.value * e.scale, 0.4, 6);
    })
    .onEnd(() => runOnJS(commit)());

  const rotation = Gesture.Rotation()
    .onStart(() => {
      startRot.value = rot.value;
    })
    .onUpdate((e) => {
      rot.value = startRot.value + e.rotation;
    })
    .onEnd(() => runOnJS(commit)());

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => runOnJS(onTap)(overlay));

  const gesture = Gesture.Race(tap, Gesture.Simultaneous(pan, pinch, rotation));

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
      <View style={styles.center} pointerEvents="box-none">
        <GestureDetector gesture={gesture}>
          <Animated.View style={boxStyle}>
            <View style={selected ? styles.selectedPad : styles.pad}>
              <Text
                style={{
                  fontFamily: fontFamilyFor(overlay.fontKey),
                  fontSize: overlay.size,
                  color: overlay.color,
                  textAlign: "center",
                }}
              >
                {overlay.text}
              </Text>

              {selected && (
                <Animated.View style={[styles.deleteWrap, chromeStyle]}>
                  <Pressable
                    hitSlop={12}
                    onPress={() => onDelete(overlay.id)}
                    style={styles.delete}
                  >
                    <Ionicons name="close" size={16} color={colors.blush} />
                  </Pressable>
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
  fill: { ...StyleSheet.absoluteFillObject },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pad: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedPad: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
    borderStyle: "dashed",
    borderRadius: 10,
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
