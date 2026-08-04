import {
  colors,
  font,
  radius,
  shadow,
  spacing,
  tint,
} from "@/components/ui/squish";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export type StatCardTone = "primary" | "blush" | "mint" | "butter";

const TONES: Record<StatCardTone, { fg: string; bg: string }> = {
  primary: { fg: colors.primary, bg: colors.soft },
  blush: { fg: colors.blush, bg: tint(colors.blush, 0.85) },
  mint: { fg: colors.mint, bg: tint(colors.mint, 0.85) },
  butter: { fg: colors.butter, bg: tint(colors.butter, 0.85) },
};

export type StatCardProps = {
  icon: IoniconName;
  value: number | string;
  label: string;
  tone?: StatCardTone;
  style?: StyleProp<ViewStyle>;
};

export function StatCard({
  icon,
  value,
  label,
  tone = "primary",
  style,
}: StatCardProps) {
  const { fg, bg } = TONES[tone];

  return (
    <View style={[styles.card, style]}>
      <View style={[styles.icon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={fg} />
      </View>
      <Text style={styles.number}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function StatCardRow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.lg },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  number: { fontSize: 32, fontFamily: font.displayBold, color: colors.plumInk },
  label: { fontSize: 14, fontFamily: font.ui, color: colors.softInk },
});
