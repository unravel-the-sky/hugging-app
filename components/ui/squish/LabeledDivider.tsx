import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, font, spacing } from "./theme";

export type LabeledDividerProps = {
  label: string;
  /**
   * Ink for the label and the rules. Defaults to the muted body ink, which
   * suits a light surface; pass `readableText(backdrop)` when the divider
   * sits on a colour the sender chose.
   */
  tint?: string;
  /** Spacing around the divider, which differs per surface. */
  style?: StyleProp<ViewStyle>;
};

/**
 * A section rule with its label set into it: ─── label ───
 *
 * The two rules flex, so the label stays centred whatever its length.
 */
export const LabeledDivider = ({
  label,
  tint = colors.softInk,
  style,
}: LabeledDividerProps) => (
  <View style={[styles.divider, style]}>
    <View style={[styles.line, { backgroundColor: tint }]} />
    <Text style={[styles.label, { color: tint }]}>{label}</Text>
    <View style={[styles.line, { backgroundColor: tint }]} />
  </View>
);

const styles = StyleSheet.create({
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  // Opacities rather than separate colours, so one `tint` reads correctly on
  // a light or a dark ground: the rule recedes, the label leads.
  line: {
    flex: 1,
    height: 1.5,
    opacity: 0.35,
  },
  label: {
    fontFamily: font.uiBold,
    fontSize: 11.5,
    letterSpacing: 0.2,
    opacity: 0.8,
  },
});
