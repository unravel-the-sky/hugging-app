import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { scheduleOnRN } from "react-native-worklets";

const NUM_HEARTS = 20;

function HeatParticle({ active }: { active: boolean }) {
  const progress = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const rotation = useSharedValue(0);
  const maxScale = useSharedValue(0);
  const isActive = useSharedValue(active ? 1 : 0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fireHeart = () => {
    if (isActive.value !== 1) return;

    const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.4;
    const dist = 90 + Math.random() * 130;

    tx.value = Math.cos(angle) * dist;
    ty.value = Math.sin(angle) * dist;
    rotation.value = (Math.random() - 0.5) * 50;
    maxScale.value = 0.7 + Math.random() * 0.7;

    progress.value = 0;
    progress.value = withTiming(
      1,
      {
        duration: 1800 + Math.random() * 1400,
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
      timeoutRef.current = setTimeout(fireHeart, 200 + Math.random() * 900);
    }
  };

  useEffect(() => {
    isActive.value = active ? 1 : 0;
    if (active)
      timeoutRef.current = setTimeout(fireHeart, Math.random() * 1500);

    return () => clearTimeout(timeoutRef.current);
  }, [active]);

  const heartStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85; // pop in, slow fade
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
      style={[StyleSheet.absoluteFill, styles.center, heartStyle]}
      pointerEvents="none"
    >
      <Ionicons name="heart" size={26} color="#FF6B6B" />
    </Animated.View>
  );
}

export default function HeartParticles({ active }: { active: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: NUM_HEARTS }).map((_, index) => (
        <HeatParticle key={index} active={active} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
