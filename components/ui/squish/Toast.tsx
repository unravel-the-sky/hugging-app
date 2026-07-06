// components/ui/squish/Toast.tsx
//
// Tiny plush toast. Controlled: pass `visible` + `message`; it fades/slides in,
// waits ~1.6s, fades out, then calls onHide so the parent can reset state.

import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { scheduleOnRN } from "react-native-worklets";
import { colors, font, radius, shadow } from "./theme";

export default function Toast({
  visible,
  message,
  onHide,
  icon = "checkmark-circle",
}: {
  visible: boolean;
  message: string;
  onHide: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    if (!visible) return;

    opacity.value = withTiming(1, { duration: 200 });
    translateY.value = withTiming(0, { duration: 200 });

    const t = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 260 });
      translateY.value = withTiming(16, { duration: 260 }, (finished) => {
        if (finished) scheduleOnRN(onHide);
      });
    }, 1600);

    return () => clearTimeout(t);
  }, [visible, opacity, translateY, onHide]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, style]} pointerEvents="none">
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 140,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    zIndex: 30,
    ...shadow,
  },
  text: {
    fontFamily: font.uiBold,
    fontSize: 15,
    color: colors.plumInk,
  },
});
