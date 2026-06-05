import React from "react";
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, font } from "./theme";

export interface AvatarProps {
  size?: number;
  /** Background / face fill color. */
  color?: string;
  /** Initials, e.g. "M". Ignored if `face` or `imageUri` is set. */
  initials?: string;
  /** Draw a soft face instead of initials. */
  face?: "happy";
  imageUri?: string;
  /** White ring around the avatar (used in the couple unit). */
  ring?: boolean;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}

function Avatar({
  size = 56,
  color = colors.lilac,
  initials,
  face,
  imageUri,
  ring = false,
  textColor = colors.surface,
  style,
}: AvatarProps) {
  const circle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...(ring
      ? {
          borderWidth: Math.max(2, size * 0.05),
          borderColor: colors.surface,
        }
      : null),
  };

  return (
    <View style={[circle, style]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} />
      ) : face === "happy" ? (
        <Face size={size} />
      ) : initials ? (
        <Text
          style={{
            fontFamily: font.displayBold,
            fontWeight: "700",
            fontSize: size * 0.4,
            color: textColor,
          }}
        >
          {initials}
        </Text>
      ) : null}
    </View>
  );
}

/** A soft drawn face — eyes, cheeks, smile — built from plain Views (no SVG). */
function Face({ size }: { size: number }) {
  const eye: ViewStyle = {
    position: "absolute",
    width: size * 0.09,
    height: size * 0.13,
    borderRadius: size * 0.06,
    backgroundColor: colors.plumInk,
    top: size * 0.38,
  };
  const cheek: ViewStyle = {
    position: "absolute",
    width: size * 0.16,
    height: size * 0.1,
    borderRadius: size * 0.08,
    backgroundColor: "rgba(238,131,174,0.45)",
    top: size * 0.55,
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[cheek, { left: size * 0.13 }]} />
      <View style={[cheek, { right: size * 0.13 }]} />
      <View style={[eye, { left: size * 0.31 }]} />
      <View style={[eye, { right: size * 0.31 }]} />
      <View style={styles.smileRow} pointerEvents="none">
        <View
          style={{
            width: size * 0.24,
            height: size * 0.12,
            borderBottomLeftRadius: size * 0.12,
            borderBottomRightRadius: size * 0.12,
            borderWidth: size * 0.035,
            borderTopWidth: 0,
            borderColor: colors.plumInk,
            backgroundColor: "transparent",
          }}
        />
      </View>
    </View>
  );
}

export interface CoupleAvatarProps {
  left: AvatarProps;
  right: AvatarProps;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Two overlapping ringed avatars — the "couple unit". */
export function CoupleAvatar({
  left,
  right,
  size = 56,
  style,
}: CoupleAvatarProps) {
  return (
    <View style={[styles.couple, style]}>
      <Avatar {...left} size={size} ring />
      <Avatar
        {...right}
        size={size}
        ring
        style={{ marginLeft: -size * 0.42 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  smileRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "20%",
    alignItems: "center",
  },
  couple: { flexDirection: "row", alignItems: "center" },
});

export default Avatar;
