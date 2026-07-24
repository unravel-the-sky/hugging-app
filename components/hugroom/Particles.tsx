import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { colors } from "@/components/ui/squish/theme";

/**
 * Same shape as HeartParticles — each particle owns its own loop and refires on
 * a random delay, so the emitter never pulses in lockstep. Parameterised so the
 * hug room can use one component for both stages.
 */

export type ParticleKind = "star" | "heart";

type Preset = {
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  size: [number, number];
  /** Centre of the emission cone, radians. -PI/2 is straight up. */
  baseAngle: number;
  /** Width of the cone. TAU = all directions. */
  spread: number;
  distance: [number, number];
  duration: [number, number];
  gap: [number, number];
  palette: string[];
};

const PRESETS: Record<ParticleKind, Preset> = {
  // Stage one: small, quiet, radiating evenly — a thing that's just appeared.
  star: {
    icon: "sparkles",
    count: 10,
    size: [9, 6],
    baseAngle: 0,
    spread: Math.PI * 2,
    distance: [34, 46],
    duration: [900, 700],
    gap: [260, 900],
    palette: [colors.butter, colors.surface, colors.soft],
  },
  // Stage two: bigger, upward, unmistakable — the hug landed.
  heart: {
    icon: "heart",
    count: 18,
    size: [18, 12],
    baseAngle: -Math.PI * 0.5,
    spread: 1.5,
    distance: [80, 130],
    duration: [1700, 1300],
    gap: [180, 800],
    palette: [colors.blush, colors.peach, colors.primary],
  },
};

const pick = <T,>(xs: readonly T[]) =>
  xs[Math.floor(Math.random() * xs.length)];

function Particle({ active, preset }: { active: boolean; preset: Preset }) {
  const progress = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const rotation = useSharedValue(0);
  const maxScale = useSharedValue(0);
  const isActive = useSharedValue(active ? 1 : 0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Chosen once, not per render — otherwise the icon flickers every frame.
  const look = useMemo(
    () => ({
      color: pick(preset.palette),
      size: preset.size[0] + Math.random() * preset.size[1],
    }),
    [preset],
  );

  const fire = () => {
    if (isActive.value !== 1) return;

    const angle = preset.baseAngle + (Math.random() - 0.5) * preset.spread;
    const dist = preset.distance[0] + Math.random() * preset.distance[1];

    tx.value = Math.cos(angle) * dist;
    ty.value = Math.sin(angle) * dist;
    rotation.value = (Math.random() - 0.5) * 60;
    maxScale.value = 0.7 + Math.random() * 0.6;

    progress.value = 0;
    progress.value = withTiming(
      1,
      {
        duration: preset.duration[0] + Math.random() * preset.duration[1],
        easing: Easing.out(Easing.quad),
      },
      (finished) => {
        "worklet";
        if (finished) scheduleOnRN(refire);
      },
    );
  };

  const refire = () => {
    if (isActive.value === 1) {
      timeoutRef.current = setTimeout(
        fire,
        preset.gap[0] + Math.random() * preset.gap[1],
      );
    }
  };

  useEffect(() => {
    isActive.value = active ? 1 : 0;
    if (active) {
      timeoutRef.current = setTimeout(fire, Math.random() * preset.gap[1]);
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
    return () => clearTimeout(timeoutRef.current);
  }, [active, preset]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    return {
      opacity,
      transform: [
        { translateX: tx.value * p },
        { translateY: ty.value * p },
        { scale: (0.4 + 0.6 * p) * maxScale.value },
        { rotate: `${rotation.value * p}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.center, style]}
      pointerEvents="none"
    >
      <Ionicons name={preset.icon} size={look.size} color={look.color} />
    </Animated.View>
  );
}

export default function Particles({
  active,
  kind,
}: {
  active: boolean;
  kind: ParticleKind;
}) {
  const preset = PRESETS[kind];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: preset.count }).map((_, i) => (
        <Particle key={`${kind}-${i}`} active={active} preset={preset} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
