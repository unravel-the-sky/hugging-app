import { colors, radius, shadow, spacing } from "@/components/ui/squish/theme";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

/** The plush surface that wraps a run of rows and clips their corners. */
export const RowCard = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => <View style={[styles.card, style]}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.xl,
    ...shadow,
  },
});
