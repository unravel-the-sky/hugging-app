import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  colors,
  font,
  radius,
  shadow,
  spacing,
} from "@/components/ui/squish/theme";

/** How tall the release-notes card is, list scrolling included. */
const CARD_HEIGHT = 190;

/**
 * What's new in this release. Hardcoded on purpose — bump the version and
 * rewrite the bullets whenever a new build goes out.
 */
export const RELEASE = {
  version: 18,
  notes: [
    {
      title: "More messages (3) per hugback",
      body: "You can send several notes back instead of just one, woo! Go ahead and test it!",
    },
    {
      title: "Pull to refresh",
      body: "Pull the hugs list down and it fetches the fresh ones!",
    },
    {
      title: "Postcard background",
      body: "Tap on the background when making postcard to change background and hearts' color",
    },
    {
      title: "A logo that tilts",
      body: "Touch and drag the logo to strech it, just for fun",
    },
  ],
};

/** Renders nothing for a release with no bullets, so callers can render it
 * unconditionally. */
export function ReleaseNotes({ onClose }: { onClose: () => void }) {
  if (RELEASE.notes.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>v{RELEASE.version}</Text>
        </View>
        <Text style={styles.heading}>
          Welcome to version {RELEASE.version}!
        </Text>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss the release notes"
          style={({ pressed }) => [
            styles.close,
            pressed && styles.closePressed,
          ]}
        >
          <Ionicons name="close" size={16} color={colors.softInk} />
        </Pressable>
      </View>
      <Text style={styles.intro}>In this version, I&apos;ve done:</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {RELEASE.notes.map((note) => (
          <View key={note.title} style={styles.item}>
            <Text style={styles.bullet}>•</Text>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{note.title}</Text>
              <Text style={styles.itemBody}>{note.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 4,
    marginTop: spacing.sm,
    ...shadow,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  close: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.mistBg,
    alignItems: "center",
    justifyContent: "center",
  },
  closePressed: {
    backgroundColor: colors.soft,
  },
  badge: {
    backgroundColor: colors.soft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontFamily: font.displayBold,
    fontSize: 13,
    color: colors.primary,
  },
  heading: {
    flex: 1,
    fontFamily: font.display,
    fontSize: 15,
    color: colors.plumInk,
  },
  intro: {
    fontFamily: font.ui,
    fontSize: 13,
    color: colors.softInk,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  item: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  bullet: {
    fontFamily: font.uiBold,
    fontSize: 14,
    color: colors.blush,
    lineHeight: 18,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: font.uiBold,
    fontSize: 14,
    color: colors.plumInk,
  },
  itemBody: {
    fontFamily: font.ui,
    fontSize: 13,
    color: colors.softInk,
    lineHeight: 18,
  },
});
