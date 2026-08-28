import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { colors, font, radius, spacing } from "@/components/ui/squish/theme";

/** Keeps the notes list from pushing the sheet off-screen on small phones. */
const NOTES_MAX_HEIGHT = 300;

/**
 * What's new in this release. Hardcoded on purpose — bump the version and
 * rewrite the bullets whenever a new build goes out.
 */
export const RELEASE = {
  version: 20,
  notes: [
    {
      title: "Camera takes the whole screen",
      body: "Taking a picture is full-bleed now, and the hand-off into the editor animates instead of jumping.",
    },
    {
      title: "Text overlays behave",
      body: "Dragging, editing and placing text on a hug is steadier.",
    },
    {
      title: "Invite your friends",
      body: "Share sheet invites that carry your username, plus fixes to searching for and adding people.",
    },
    {
      title: "Zen bot",
      body: "A new bot that hugs you back with a little wisdom. The other bots got smarter too.",
    },
  ],
};

/**
 * The version chip that lives next to the app title. Tapping it is the only
 * way into the release notes now — they no longer sit on the landing page.
 */
export function VersionBadge({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Version ${RELEASE.version}. Opens what's new.`}
      style={({ pressed }) => [styles.badge, pressed && styles.badgePressed]}
    >
      <Text style={styles.badgeText}>v{RELEASE.version}</Text>
    </Pressable>
  );
}

/** Renders nothing for a release with no bullets, so callers can render it
 * unconditionally. */
export function ReleaseNotesModal({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose: () => void;
}) {
  if (RELEASE.notes.length === 0) return null;

  return (
    <ConfirmationModal
      isVisible={isVisible}
      title={`What's new in v${RELEASE.version}`}
      confirmButtonLabel="Got it"
      onConfirm={onClose}
      onRequestClose={onClose}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
    </ConfirmationModal>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.soft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgePressed: {
    backgroundColor: colors.lilac,
  },
  badgeText: {
    fontFamily: font.displayBold,
    fontSize: 13,
    color: colors.primary,
  },
  scroll: {
    maxHeight: NOTES_MAX_HEIGHT,
  },
  scrollContent: {
    gap: spacing.md,
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
