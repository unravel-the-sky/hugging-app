import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { colors, darken } from "./theme";

export type IconButtonVariant = "primary" | "blush" | "surface";

export interface IconButtonProps {
  /** Icon node — comes from your icon library. Color it with iconButtonTint(). */
  icon: React.ReactNode;
  onPress?: () => void;
  variant?: IconButtonVariant;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const DEPTH = 4;

const VARIANTS: Record<
  IconButtonVariant,
  { face: string; underside: string; shadowColor: string; tint: string }
> = {
  primary: {
    face: colors.primary,
    underside: colors.deep,
    shadowColor: colors.deep,
    tint: colors.surface,
  },
  blush: {
    face: colors.blush,
    underside: darken(colors.blush, 0.18),
    shadowColor: darken(colors.blush, 0.2),
    tint: colors.surface,
  },
  surface: {
    face: colors.surface,
    underside: colors.soft,
    shadowColor: colors.lilac,
    tint: colors.primary,
  },
};

/**
 * Color of the icon for the chosen variant — pass this to your icon node
 * (e.g. `<Feather color={iconButtonTint('surface')} />`).
 */
export const iconButtonTint = (variant: IconButtonVariant = "primary") =>
  VARIANTS[variant].tint;

export function IconButton({
  icon,
  onPress,
  variant = "primary",
  size = 56,
  disabled = false,
  style,
  accessibilityLabel,
}: IconButtonProps) {
  const v = VARIANTS[variant];
  const press = useRef(new Animated.Value(0)).current;

  const animate = (to: number) =>
    Animated.spring(press, {
      toValue: to,
      useNativeDriver: false,
      speed: 40,
      bounciness: 6,
    }).start();

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

  const r = size / 2;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      disabled={disabled}
      style={[disabled && styles.disabled, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={{ width: size, height: size + DEPTH }}>
        <Animated.View
          style={[
            styles.base,
            {
              height: size,
              borderRadius: r,
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
            {
              height: size,
              borderRadius: r,
              backgroundColor: v.face,
              transform: [{ translateY }],
            },
          ]}
        >
          {icon}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  base: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    shadowOffset: { width: 0, height: 4 },
  },
  face: {
    alignItems: "center",
    justifyContent: "center",
  },
});
