import { FriendAvatar } from "@/components/ui/squish/FriendAvatar";
import {
  colors,
  font,
  radius,
  shadow,
  spacing,
  tint,
} from "@/components/ui/squish/theme";
import { useAvatarThumb } from "@/hooks/useAvatarThumbnail";
import { Hug } from "@/lib/handleHugs";
import { Direction, PersonGroup } from "@/lib/hugs/groups";
import { hugMillis, relTime } from "@/lib/hugs/time";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { HugRow } from "./HugListComponents";

const TopHuggerBadge = () => (
  <View style={styles.topBadge}>
    <Text style={styles.topBadgeText}>TOP HUGGER</Text>
  </View>
);

/**
 * One person, their hug count, and their hugs revealed on tap.
 *
 * Direction-agnostic: it renders whatever `group` it's handed and passes
 * `direction` straight down to the rows.
 */
export const PersonGroupCard = ({
  group,
  direction,
  isTop,
  expanded,
  onToggle,
  onSelectHug,
}: {
  group: PersonGroup;
  direction: Direction;
  isTop: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelectHug: (hug: Hug) => void;
}) => {
  const [contentHeight, setContentHeight] = useState(0);
  const progress = useSharedValue(0);
  const photoUri = useAvatarThumb(group.uid);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, progress]);

  const bodyStyle = useAnimatedStyle(() => ({
    height: progress.value * contentHeight,
    opacity: progress.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 90}deg` }],
  }));

  return (
    <View style={[styles.card, isTop && styles.cardTop]}>
      <Pressable style={styles.header} onPress={onToggle}>
        <View style={isTop && styles.avatarRing}>
          <FriendAvatar name={group.name} photoUri={photoUri ?? undefined} />
        </View>

        <View style={styles.headerBody}>
          {isTop && <TopHuggerBadge />}
          <Text style={styles.name} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={styles.lastSeen} numberOfLines={1}>
            {relTime(hugMillis(group.last))}
          </Text>
        </View>

        {!expanded && (
          <View style={styles.countPill}>
            <Text style={styles.countPillNum}>{group.count}</Text>
            <Text style={styles.countPillLabel}>HUGS</Text>
          </View>
        )}

        <Animated.View style={[styles.chevron, chevronStyle]}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Animated.View>
      </Pressable>

      {/* The clip animates height; the measured child sits at its natural
          height, absolutely positioned so it doesn't drive the clip. */}
      <Animated.View style={[styles.expandClip, bodyStyle]}>
        <View
          style={styles.expandMeasure}
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
        >
          {group.hugs.map((hug, i) => (
            <HugRow
              key={hug.id}
              hug={hug}
              direction={direction}
              showDivider={i < group.hugs.length - 1}
              onPress={() => onSelectHug(hug)}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
    ...shadow,
  },
  cardTop: {
    backgroundColor: tint(colors.butter, 0.65),
    borderWidth: 1,
    borderColor: colors.butter,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  avatarRing: {
    borderWidth: 3,
    borderColor: colors.butter,
    borderRadius: radius.pill,
    padding: 2,
  },
  headerBody: {
    flex: 1,
    marginLeft: spacing.sm,
    gap: spacing.xs,
    alignItems: "flex-start",
  },
  name: {
    fontFamily: font.displayBold,
    fontSize: 18,
    color: colors.plumInk,
    flexShrink: 1,
  },
  lastSeen: {
    fontFamily: font.ui,
    fontSize: 14,
    color: colors.softInk,
  },
  topBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.butter,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  topBadgeText: {
    fontFamily: font.uiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.plumInk,
  },
  countPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: "center",
    ...shadow,
    shadowOpacity: 0.18,
  },
  countPillNum: {
    fontFamily: font.displayBold,
    color: colors.surface,
  },
  countPillLabel: {
    fontFamily: font.uiBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.surface,
    opacity: 0.85,
  },
  chevron: { marginLeft: spacing.xs },

  expandClip: { overflow: "hidden" },
  expandMeasure: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    borderTopWidth: 1,
    borderTopColor: tint(colors.softInk, 0.55),
    backgroundColor: colors.surface,
  },
});
