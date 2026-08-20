import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font, radius, spacing } from "./squish";

type SettingToggleRowProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

/** A settings card: icon, label, explanation, and a checkbox on the right. */
export const SettingToggleRow = ({
  icon,
  title,
  subtitle,
  value,
  onChange,
  disabled,
}: SettingToggleRowProps) => {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardOn]}
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={[styles.check, value && styles.checkOn]}>
        {value && (
          <Ionicons name="checkmark" size={20} color={colors.surface} />
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardOn: { backgroundColor: colors.mistBg },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.mistBg,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  title: {
    fontFamily: font.displayBold,
    fontSize: 17,
    color: colors.plumInk,
  },
  subtitle: {
    fontFamily: font.ui,
    fontSize: 14,
    color: colors.softInk,
    lineHeight: 19,
  },
  check: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
