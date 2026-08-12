import {
  colors,
  darken,
  font,
  radius,
  spacing,
  tint,
} from "@/components/ui/squish";
import { FriendAvatar } from "@/components/ui/squish/FriendAvatar";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/** The four things a block actually does, spelled out before it happens. */
const consequences = (name: string) => [
  {
    icon: "person-remove-outline" as const,
    tone: colors.blush,
    title: "You stop being friends",
    body: `${name} leaves your friends list, and you leave theirs.`,
  },
  {
    icon: "paper-plane-outline" as const,
    tone: colors.primary,
    title: "Their hugs stop arriving",
    body: "Anything they send — hugs, nudges, photos — never lands.",
  },
  {
    icon: "eye-off-outline" as const,
    tone: colors.primary,
    title: "They can't find you",
    body: "Your profile, status and streaks disappear from their app.",
  },
  {
    icon: "trash-outline" as const,
    tone: colors.blush,
    title: "Your hugs disappear",
    body: `Every hug between you and ${name} is deleted, for both of you. This can't be undone.`,
  },
];

export type BlockFriendSheetProps = {
  visible: boolean;
  name: string;
  photoUri?: string;
  /** Disables both actions and swaps the confirm label while the call runs. */
  isBlocking?: boolean;
  hasError?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function BlockFriendSheet({
  visible,
  name,
  photoUri,
  isBlocking = false,
  hasError = false,
  onConfirm,
  onCancel,
}: BlockFriendSheetProps) {
  const rows = consequences(name);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => !isBlocking && onCancel()}
    >
      <View style={styles.backdrop}>
        {/* tapping the dimmed area behind the sheet dismisses it */}
        <Pressable
          style={styles.backdropFill}
          onPress={() => !isBlocking && onCancel()}
        />

        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.avatarWrap}>
              <FriendAvatar name={name} size={96} photoUri={photoUri} />
              <View style={styles.blockBadge}>
                <Ionicons name="ban" size={18} color={colors.surface} />
              </View>
            </View>

            <Text style={styles.title}>Block {name}?</Text>
            <Text style={styles.subtitle}>
              They won&apos;t be told, and nothing you do next is sent back to
              them.
            </Text>

            <View style={styles.rows}>
              {rows.map((row, i) => (
                <View key={row.title}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <View
                      style={[
                        styles.rowIcon,
                        { backgroundColor: tint(row.tone, 0.84) },
                      ]}
                    >
                      <Ionicons
                        name={row.icon}
                        size={20}
                        color={darken(row.tone, 0.15)}
                      />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{row.title}</Text>
                      <Text style={styles.rowBody}>{row.body}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {hasError && (
              <Text style={styles.errorText}>
                Could not block right now. Please try again.
              </Text>
            )}

            <PlushButton
              label={isBlocking ? "blocking…" : "Block & remove"}
              variant="blush"
              fullWidth
              disabled={isBlocking}
              onPress={onConfirm}
            />

            <Pressable
              onPress={onCancel}
              disabled={isBlocking}
              accessibilityRole="button"
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>Not now</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(51, 44, 92, 0.45)",
  },

  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing.md,
    maxHeight: "92%",
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.soft,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 1.5,
    alignItems: "center",
    gap: spacing.lg,
  },

  avatarWrap: { position: "relative" },
  blockBadge: {
    position: "absolute",
    right: -2,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: darken(colors.blush, 0.28),
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    fontFamily: font.displayBold,
    color: colors.plumInk,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: font.ui,
    color: colors.softInk,
    textAlign: "center",
    lineHeight: 22,
  },

  rows: { alignSelf: "stretch" },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontFamily: font.uiBold, color: colors.plumInk },
  rowBody: {
    fontSize: 15,
    fontFamily: font.ui,
    color: colors.softInk,
    lineHeight: 20,
  },
  divider: { height: 1, backgroundColor: colors.mistBg },

  errorText: {
    fontSize: 14,
    fontFamily: font.ui,
    color: colors.blush,
    textAlign: "center",
  },

  cancel: { paddingVertical: spacing.sm },
  cancelText: { fontSize: 17, fontFamily: font.uiBold, color: colors.softInk },
});
