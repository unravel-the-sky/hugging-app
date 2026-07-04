// components/postcard/FineTunePad.tsx
//
// Bottom sheet for per-filter hue + luminance tuning. The pad maps touch
// position -> hue (cool↔warm) and luminance (brighter↔darker), driving the
// passed shared values live so the Skia image updates in real time.
//
// Ranges: hue ∈ [-HUE_MAX, +HUE_MAX] degrees, light ∈ [-LIGHT_MAX, +LIGHT_MAX].

import { Canvas, LinearGradient, Rect, vec } from "@shopify/react-native-skia";
import React, { useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

import { PlushButton } from "@/components/ui/squish/PlushButton";
import { colors, font, radius } from "@/components/ui/squish/theme";
import Ionicons from "@expo/vector-icons/Ionicons";

const PAD_W = Dimensions.get("window").width - 32;
const PAD_H = 190;
const KNOB = 44;

const HUE_MAX = 60; // degrees
const LIGHT_MAX = 0.35; // additive luminance

const clampW = (v: number, lo: number, hi: number) => {
  "worklet";
  return Math.min(Math.max(v, lo), hi);
};

export default function FineTunePad({
  filterName,
  hue,
  light,
  onDone,
  onReset,
}: {
  filterName: string;
  hue: SharedValue<number>;
  light: SharedValue<number>;
  onDone: () => void;
  onReset: () => void;
}) {
  // Readouts mirror the shared values; only re-render on integer change.
  const [hueLabel, setHueLabel] = useState(Math.round(hue.value));
  const [lightLabel, setLightLabel] = useState(Math.round(light.value * 100));

  const pushLabels = (h: number, l: number) => {
    const hr = Math.round(h);
    const lr = Math.round(l * 100);
    setHueLabel((prev) => (prev === hr ? prev : hr));
    setLightLabel((prev) => (prev === lr ? prev : lr));
  };

  const applyFromXY = (px: number, py: number) => {
    "worklet";
    const x = clampW(px, 0, PAD_W);
    const y = clampW(py, 0, PAD_H);
    const h = (x / PAD_W) * 2 * HUE_MAX - HUE_MAX; // left -MAX .. right +MAX
    const l = LIGHT_MAX - (y / PAD_H) * 2 * LIGHT_MAX; // top +MAX .. bottom -MAX
    hue.value = h;
    light.value = l;
    runOnJS(pushLabels)(h, l);
  };

  const pan = Gesture.Pan()
    .onBegin((e) => applyFromXY(e.x, e.y))
    .onUpdate((e) => applyFromXY(e.x, e.y));

  const knobStyle = useAnimatedStyle(() => {
    const x = ((hue.value + HUE_MAX) / (2 * HUE_MAX)) * PAD_W;
    const y = ((LIGHT_MAX - light.value) / (2 * LIGHT_MAX)) * PAD_H;
    return {
      left: clampW(x, 0, PAD_W) - KNOB / 2,
      top: clampW(y, 0, PAD_H) - KNOB / 2,
    };
  });

  const handleReset = () => {
    hue.value = 0;
    light.value = 0;
    setHueLabel(0);
    setLightLabel(0);
    onReset();
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="options-outline" size={18} color={colors.primary} />
          <Text style={styles.title}>Tune {filterName}</Text>
        </View>
        <PlushButton
          label="Reset"
          variant="soft"
          height={38}
          onPress={handleReset}
          icon={<Ionicons name="refresh" size={15} color={colors.primary} />}
        />
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.pad}>
          <Canvas style={{ width: PAD_W, height: PAD_H }}>
            {/* horizontal hue sweep */}
            <Rect x={0} y={0} width={PAD_W} height={PAD_H}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(PAD_W, 0)}
                colors={[
                  colors.blush,
                  colors.lilac,
                  colors.butter,
                  colors.mint,
                ]}
              />
            </Rect>
            {/* vertical brighter/darker overlay */}
            <Rect x={0} y={0} width={PAD_W} height={PAD_H}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, PAD_H)}
                colors={[
                  "rgba(255,255,255,0.55)",
                  "rgba(255,255,255,0)",
                  "rgba(0,0,0,0.55)",
                ]}
              />
            </Rect>
          </Canvas>

          {/* axis labels */}
          <Text style={[styles.axis, styles.axisTop]}>brighter</Text>
          <Text style={[styles.axis, styles.axisBottom]}>darker</Text>
          <Text style={[styles.axis, styles.axisLeft]}>cool</Text>
          <Text style={[styles.axis, styles.axisRight]}>warm</Text>

          <Animated.View
            style={[styles.knob, knobStyle]}
            pointerEvents="none"
          />
        </View>
      </GestureDetector>

      <View style={styles.footer}>
        <View style={styles.readout}>
          <Text style={styles.readLabel}>HUE</Text>
          <Text style={styles.readValue}>
            {hueLabel > 0 ? `+${hueLabel}` : hueLabel}°
          </Text>
        </View>
        <View style={styles.readout}>
          <Text style={styles.readLabel}>LIGHT</Text>
          <Text style={styles.readValue}>
            {lightLabel > 0 ? `+${lightLabel}` : lightLabel}%
          </Text>
        </View>
        <PlushButton
          label="Done"
          onPress={onDone}
          height={46}
          icon={<Ionicons name="checkmark" size={18} color={colors.surface} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.mistBg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: font.displayBold, fontSize: 18, color: colors.plumInk },
  pad: {
    width: PAD_W,
    height: PAD_H,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  axis: {
    position: "absolute",
    color: "rgba(255,255,255,0.9)",
    fontFamily: font.uiBold,
    fontSize: 12,
  },
  axisTop: {
    top: 8,
    alignSelf: "center",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  axisBottom: {
    bottom: 8,
    alignSelf: "center",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  axisLeft: { left: 12, top: PAD_H / 2 - 8 },
  axisRight: { right: 12, top: PAD_H / 2 - 8 },
  knob: {
    position: "absolute",
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 4,
    borderColor: "white",
    backgroundColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  footer: { flexDirection: "row", alignItems: "center", gap: 10 },
  readout: {
    flex: 1,
    backgroundColor: colors.soft,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  readLabel: {
    fontFamily: font.uiBold,
    fontSize: 11,
    color: colors.softInk,
    letterSpacing: 0.5,
  },
  readValue: {
    fontFamily: font.displayBold,
    fontSize: 18,
    color: colors.plumInk,
  },
});
