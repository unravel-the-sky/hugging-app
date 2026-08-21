import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { colors, radius, shadow, spacing } from "./theme";

/**
 * The plush surface that wraps a run of rows and clips their corners.
 *
 * Use it when a whole group is rendered at once (a day of hugs). For rows that
 * come out of a FlatList one at a time, skip the group and let each `ListRow`
 * round its own end with `isFirst` / `isLast`.
 */
export const ListRowGroup = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => <View style={[styles.group, style]}>{children}</View>;

export type ListRowProps = {
  children: React.ReactNode;
  /** Rounds + shadows the top of the run. Ignored inside a `ListRowGroup`. */
  isFirst?: boolean;
  /** Rounds + shadows the bottom of the run, and drops the divider. */
  isLast?: boolean;
  /** Breaks out of the run: rounded all round, with its own bottom margin. */
  standalone?: boolean;
  /** Hairline rule below the row. Defaults to "unless it ends the run". */
  showDivider?: boolean;
  /** Tighter vertical padding, for rows carrying a single line of text. */
  dense?: boolean;
  onPress?: () => void;
  /** Outer surface — background, borders, the corners. */
  style?: StyleProp<ViewStyle>;
  /** The padded row itself, inside the clip. */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * One row of a list: a white surface with padding, a divider under it, and
 * rounded corners at either end of the run.
 *
 * Corner rounding is the row's own business rather than the list's, so a row
 * can stand alone mid-list (the top hugger) without the group having to split.
 */
export const ListRow = ({
  children,
  isFirst = false,
  isLast = false,
  standalone = false,
  showDivider,
  dense = false,
  onPress,
  style,
  contentStyle,
}: ListRowProps) => {
  // a standalone row is its own card, so it never trails a divider
  const divider = showDivider ?? (!isLast && !standalone);

  return (
    <View
      style={[
        styles.surface,
        isFirst && !standalone && styles.surfaceFirst,
        isLast && !standalone && styles.surfaceLast,
        standalone && styles.surfaceStandalone,
        style,
      ]}
    >
      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.content,
            dense && styles.contentDense,
            pressed && styles.contentPressed,
            contentStyle,
          ]}
        >
          {children}
        </Pressable>
      ) : (
        <View
          style={[styles.content, dense && styles.contentDense, contentStyle]}
        >
          {children}
        </View>
      )}
      {divider && <View style={styles.divider} />}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.xl,
    ...shadow,
  },

  surface: { backgroundColor: colors.surface, overflow: "hidden" },
  surfaceFirst: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...shadow,
  },
  surfaceLast: {
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    ...shadow,
  },
  surfaceStandalone: {
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...shadow,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: "transparent",
  },
  contentDense: { paddingVertical: spacing.sm },
  contentPressed: { backgroundColor: colors.lilac },

  divider: {
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.lilac,
    marginHorizontal: spacing.lg,
  },
});
