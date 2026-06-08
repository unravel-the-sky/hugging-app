import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, darken, font, radius } from "./theme";

export type PlushButtonVariant = "primary" | "blush" | "soft";

export interface PlushButtonProps {
  label: string;
  onPress?: () => void;
  variant?: PlushButtonVariant;
  /** Leading icon — pass a node from your icon library. */
  icon?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Height of the button face (the box is this + DEPTH). */
  height?: number;
  style?: StyleProp<ViewStyle>;
  pressed?: boolean;
}

/** Visible depth of the plush "underside", in px. */
const DEPTH = 5;

const VARIANTS: Record<
  PlushButtonVariant,
  { face: string; underside: string; text: string; shadowColor: string }
> = {
  primary: {
    face: colors.primary,
    underside: colors.deep,
    text: colors.surface,
    shadowColor: colors.deep,
  },
  blush: {
    face: colors.blush,
    underside: darken(colors.blush, 0.18),
    text: colors.surface,
    shadowColor: darken(colors.blush, 0.2),
  },
  soft: {
    face: colors.soft,
    underside: colors.lilac,
    text: colors.primary,
    shadowColor: colors.lilac,
  },
};

export function PlushButton({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  fullWidth = false,
  height = 52,
  style,
  pressed,
}: PlushButtonProps) {
  const v = VARIANTS[variant];
  // Driven on the JS thread so we can animate shadow/elevation too.
  const press = useRef(new Animated.Value(0)).current;

  const isControlled = pressed !== undefined;

  const animate = (to: number) =>
    Animated.spring(press, {
      toValue: to,
      useNativeDriver: false,
      speed: 40,
      bounciness: 6,
    }).start();

  // Controlled mode: follow the prop instead of touch events.
  useEffect(() => {
    if (isControlled) animate(pressed ? 1 : 0);
  }, [isControlled, pressed]);

  const translateY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0, DEPTH],
  });
  const elevation = press.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 1],
  });
  const shadowOpacity = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.08],
  });
  const shadowRadius = press.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 2],
  });

  const content = (
    <View
      style={[
        styles.box,
        fullWidth && styles.fullWidth,
        { height: height + DEPTH },
      ]}
    >
      <Animated.View
        style={[
          styles.base,
          {
            height,
            backgroundColor: v.underside,
            shadowColor: v.shadowColor,
            shadowOpacity,
            shadowRadius,
            elevation,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.face,
          { height, backgroundColor: v.face, transform: [{ translateY }] },
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text style={[styles.label, { color: v.text }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );

  if (isControlled) {
    return (
      <View
        style={[
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          style,
        ]}
        pointerEvents="none"
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      disabled={disabled}
      style={[
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: "stretch" },
  disabled: { opacity: 0.5 },
  box: {
    // height set inline; relative positioning anchors the absolute base
    justifyContent: "flex-start",
    minWidth: 150,
  },
  base: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.button,
    shadowOffset: { width: 0, height: 4 },
  },
  face: {
    borderRadius: radius.button,
    paddingHorizontal: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { marginRight: 8 },
  label: {
    fontFamily: font.uiBold,
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.2,
  },
});
