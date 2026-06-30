import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // ← swap for your icon set
import * as Haptics from "expo-haptics";
import {
  avatarColors,
  colors,
  darken,
  font,
  radius,
  shadow,
  spacing,
  tint,
} from "./../../components/ui/squish/theme"; // ← adjust path
import { useDailyThought } from "@/hooks/useDailyThought";

/* Derived shades for tones not in the core palette (warm cream streak card etc.) */
const c = {
  cream: tint(colors.butter, 0.82),
  creamInk: darken(colors.butter, 0.62), // "5 days"
  creamMuted: darken(colors.butter, 0.3), // "hugging"
  creamSub: darken(colors.peach, 0.18), // "2 more for a new record"
  dotOff: tint(colors.peach, 0.6),
  hugFrom: colors.soft,
  badgePink: tint(colors.blush, 0.6),
  badgeInk: darken(colors.blush, 0.4),
  lavSoft: colors.soft,
  heartSoft: tint(colors.blush, 0.7),
  heartInk: darken(colors.blush, 0.18),
  divider: tint(colors.lilac, 0.7),
};

type Friend = { id: string; name: string; initial: string; color: string };
type Streak = { days: number; toRecord: number; total: number };

type Props = {
  userName?: string;
  hugsWaiting?: number;
  hugFrom?: string;
  streak?: Streak;
  friends?: Friend[];
  onOpenHugs?: () => void;
  onQuickSend?: (friend: Friend) => void;
  onPromptPress?: () => void;
};

/* Demo data so it renders immediately — wire to your Firestore / FriendPicker store */
const DEMO_FRIENDS: Friend[] = [
  { id: "1", name: "Jordan", initial: "J", color: avatarColors.blush },
  { id: "2", name: "Mum", initial: "M", color: avatarColors.peach },
  { id: "3", name: "Alex", initial: "A", color: avatarColors.mint },
  { id: "4", name: "Rae", initial: "R", color: avatarColors.butter },
  { id: "5", name: "Sam", initial: "S", color: colors.sky },
];

export default function HomeScreen({
  userName = "Rae",
  hugsWaiting = 2,
  hugFrom = "Mum & Alex",
  streak = { days: 5, toRecord: 2, total: 7 },
  friends = DEMO_FRIENDS,
  onOpenHugs,
  onQuickSend,
  onPromptPress,
}: Props) {
  const thought = useDailyThought();
  const tap = (fn?: () => void) => () => {
    Haptics.selectionAsync();
    fn?.();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Hugs waiting */}
      {hugsWaiting > 0 && (
        <Pressable onPress={tap(onOpenHugs)} style={styles.hugCard}>
          <View style={styles.hugIcon}>
            <Ionicons name="hand-left-outline" size={36} color={colors.deep} />
            <View style={styles.hugBadge}>
              <Text style={styles.hugBadgeText}>{hugsWaiting}</Text>
            </View>
          </View>
          <View style={styles.flex}>
            <Text style={styles.hugTitle}>
              {hugsWaiting} hug{hugsWaiting > 1 ? "s" : ""} waiting
            </Text>
            <Text style={styles.hugFrom}>from {hugFrom} · unopened</Text>
            <View style={styles.openBtn}>
              <Ionicons name="gift-outline" size={18} color={colors.primary} />
              <Text style={styles.openBtnText}>Open them</Text>
            </View>
          </View>
        </Pressable>
      )}

      {/* Streak */}
      <View style={styles.streakCard}>
        <View style={styles.streakIcon}>
          <Ionicons name="flame" size={26} color={colors.peach} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.streakTitle}>
            <Text style={styles.streakDays}>{streak.days} days</Text>
            <Text style={styles.streakHugging}> hugging</Text>
          </Text>
          <Text style={styles.streakSub}>
            {streak.toRecord} more for a new record
          </Text>
        </View>
        <View style={styles.dots}>
          {Array.from({ length: streak.total }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < streak.days ? styles.dotOn : styles.dotOff,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Quick send */}
      <View style={styles.rowBetween}>
        <Text style={styles.sectionLabel}>QUICK SEND</Text>
        <Text style={styles.link}>tap to hug</Text>
      </View>
      <View style={styles.friends}>
        {friends.map((f) => (
          <Pressable
            key={f.id}
            onPress={tap(() => onQuickSend?.(f))}
            style={styles.friend}
          >
            <View style={[styles.avatar, { backgroundColor: f.color }]}>
              <Text style={styles.avatarText}>{f.initial}</Text>
              <View style={styles.avatarBadge}>
                <Ionicons name="hand-left" size={11} color="#fff" />
              </View>
            </View>
            <Text style={styles.friendName}>{f.name}</Text>
          </Pressable>
        ))}
      </View>

      {/* Daily prompt + warm thought */}
      <Pressable onPress={tap(onPromptPress)} style={styles.thoughtCard}>
        <View style={styles.thoughtHead}>
          <View style={[styles.softIcon, { backgroundColor: c.lavSoft }]}>
            <Ionicons name="sunny-outline" size={20} color={colors.deep} />
          </View>
          <Text style={styles.thoughtQ}>Who needs a hug today?</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.thoughtBody}>
          <View style={[styles.softIcon, { backgroundColor: c.heartSoft }]}>
            <Ionicons name="heart" size={20} color={c.heartInk} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.thoughtLabel}>TODAYS WARM THOUGHT</Text>
            <Text style={styles.thoughtText}>{thought}</Text>
          </View>
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mistBg },
  content: { padding: spacing.lg + 2, paddingBottom: 40, gap: spacing.lg },
  flex: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.xs,
  },
  greeting: { fontFamily: font.ui, fontSize: 15, color: colors.softInk },
  name: { fontFamily: font.display, fontSize: 30, color: colors.plumInk },
  bell: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 12,
    right: 14,
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.blush,
  },

  hugCard: {
    ...shadow,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl - 4,
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "center",
  },
  hugIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  hugBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: c.badgePink,
    alignItems: "center",
    justifyContent: "center",
  },
  hugBadgeText: { fontFamily: font.uiBold, fontSize: 14, color: c.badgeInk },
  hugTitle: { fontFamily: font.display, fontSize: 22, color: colors.surface },
  hugFrom: {
    fontFamily: font.ui,
    fontSize: 14,
    color: c.hugFrom,
    marginTop: spacing.xs,
  },
  openBtn: {
    marginTop: spacing.md + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  openBtnText: { fontFamily: font.ui, fontSize: 16, color: colors.primary },

  streakCard: {
    backgroundColor: c.cream,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md + 2,
    alignItems: "center",
  },
  streakIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  streakTitle: { fontFamily: font.display, fontSize: 20 },
  streakDays: { color: c.creamInk },
  streakHugging: { color: c.creamMuted },
  streakSub: {
    fontFamily: font.ui,
    fontSize: 13,
    color: c.creamSub,
    marginTop: 1,
  },
  dots: { flexDirection: "row", gap: 5 },
  dot: { width: 9, height: 9, borderRadius: radius.pill },
  dotOn: { backgroundColor: colors.peach },
  dotOff: { backgroundColor: c.dotOff },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontFamily: font.ui,
    fontSize: 13,
    color: colors.softInk,
    letterSpacing: 1,
  },
  link: { fontFamily: font.ui, fontSize: 14, color: colors.deep },
  friends: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs / 2,
  },
  friend: { alignItems: "center" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.display, fontSize: 22, color: colors.surface },
  avatarBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.deep,
    alignItems: "center",
    justifyContent: "center",
  },
  friendName: {
    fontFamily: font.ui,
    fontSize: 13,
    color: colors.softInk,
    marginTop: spacing.xs + 2,
  },

  thoughtCard: {
    ...shadow,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg + 2,
    marginTop: spacing.xs,
  },
  thoughtHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  softIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  thoughtQ: {
    fontFamily: font.display,
    fontSize: 19,
    color: colors.plumInk,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: c.divider,
    marginVertical: spacing.lg,
  },
  thoughtBody: { flexDirection: "row", gap: spacing.md },
  thoughtLabel: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.softInk,
    letterSpacing: 1,
  },
  thoughtText: {
    fontFamily: font.ui,
    fontSize: 15,
    color: colors.plumInk,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
});
