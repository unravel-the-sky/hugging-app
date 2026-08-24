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
  version: 19,
  notes: [
    {
      title: "New hugs in their own tab",
      body: "Hugs you haven't opened yet get their own tab, so nothing gets lost further down the list.",
    },
    {
      title: "Hugs grouped by friend",
      body: "The list now bundles hugs per person instead of one long stream.",
    },
    {
      title: "Hugging experience changes",
      body: "Added some physics on the arms when dragging down. Just try it!",
    },
    {
      title: "Backend fixes and improvements - for geeks",
      body: "Using zustand for caching user and friends info",
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
