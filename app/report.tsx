import { colors, font, radius, spacing, tint } from "@/components/ui/squish";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { useBlocks } from "@/hooks/useBlocks";
import { blockUser } from "@/lib/handleBlocks";
import { reportContent } from "@/lib/handleReports";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

/** Matches MAX_REPORT_NOTE server-side; the server trims to the same length. */
const MAX_NOTE = 500;

type Status = "editing" | "sending" | "done" | "error";

/**
 * Reporting a person, or one hug of theirs.
 *
 * A route rather than a component with its own <Modal>: presented as a
 * formSheet from the root stack, it gets the real iOS sheet — swipe to
 * dismiss, and the keyboard lifting the sheet instead of hiding the input —
 * none of which a hand-rolled modal gets for free. Same treatment as
 * /hug-back and /account.
 */
export default function ReportScreen() {
  const { reportedId, name, hugId } = useLocalSearchParams<{
    reportedId: string;
    name: string;
    hugId?: string;
  }>();

  const [note, setNote] = useState("");
  // Reporting someone almost always means wanting them gone, so this leads
  // with yes. The report is filed first either way — see below.
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [status, setStatus] = useState<Status>("editing");

  const refreshBlocks = useBlocks((s) => s.refresh);
  const busy = status === "sending";

  const handleSend = async () => {
    setStatus("sending");
    try {
      // Report first, always. Blocking purges every hug between the pair, so
      // reporting afterwards would file against content that no longer exists.
      await reportContent({
        reportedId,
        hugId,
        // The picker is gone: what the reporter writes is the report. The
        // server still takes a reason, and "other" is the one that means
        // "read the note".
        reason: "other",
        note: note.trim(),
      });
      if (alsoBlock) {
        await blockUser(reportedId);
        await refreshBlocks();
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <View style={styles.sheet}>
        <View style={styles.doneIcon}>
          <Ionicons name="checkmark-circle" size={48} color={colors.mint} />
        </View>
        <Text style={styles.title}>Report sent</Text>
        <Text style={styles.subtitle}>
          Thanks for telling us. We read every report and act on the ones that
          break the rules.
          {alsoBlock ? ` ${name} has been blocked and removed.` : ""}
        </Text>
        <PlushButton label="Done" fullWidth onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>Report {name}?</Text>
      <Text style={styles.subtitle}>
        They won&apos;t be told who reported them. Tell us what is wrong and
        we&apos;ll take a look.
      </Text>

      <TextInput
        style={styles.noteInput}
        placeholder="What happened?"
        placeholderTextColor={colors.softInk}
        value={note}
        onChangeText={setNote}
        editable={!busy}
        multiline
        autoFocus
        maxLength={MAX_NOTE}
        textAlignVertical="top"
      />

      <Pressable
        onPress={() => setAlsoBlock((v) => !v)}
        disabled={busy}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: alsoBlock }}
        style={styles.blockToggle}
      >
        <View style={[styles.check, alsoBlock && styles.checkOn]}>
          {alsoBlock && (
            <Ionicons name="checkmark" size={16} color={colors.surface} />
          )}
        </View>
        <View style={styles.toggleText}>
          <Text style={styles.toggleTitle}>Also block {name}</Text>
          <Text style={styles.toggleBody}>
            Stops their hugs and removes every hug between you.
          </Text>
        </View>
      </Pressable>

      {status === "error" && (
        <Text style={styles.errorText}>
          Could not send the report. Please try again.
        </Text>
      )}

      <PlushButton
        label={busy ? "sending…" : "Send report"}
        variant="blush"
        fullWidth
        disabled={busy || note.trim().length === 0}
        onPress={handleSend}
      />

      <Pressable
        onPress={() => router.back()}
        disabled={busy}
        accessibilityRole="button"
        style={styles.cancel}
      >
        <Text style={styles.cancelText}>Not now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // The sheet sizes itself to this content (fitToContents), so this padding
  // is what sets how tall it comes up.
  sheet: {
    padding: spacing.xl,
    paddingBottom: spacing.xl * 1.5,
    gap: spacing.md,
  },
  doneIcon: { alignItems: "center" },
  title: {
    fontSize: 22,
    fontFamily: font.displayBold,
    color: colors.plumInk,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: font.ui,
    color: colors.softInk,
    textAlign: "center",
    lineHeight: 21,
  },

  noteInput: {
    minHeight: 96,
    borderRadius: radius.sm,
    backgroundColor: tint(colors.primary, 0.94),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    fontFamily: font.ui,
    color: colors.plumInk,
  },

  blockToggle: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.soft,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 16, fontFamily: font.uiBold, color: colors.plumInk },
  toggleBody: {
    fontSize: 14,
    fontFamily: font.ui,
    color: colors.softInk,
    lineHeight: 19,
  },

  errorText: {
    fontSize: 14,
    fontFamily: font.ui,
    color: colors.blush,
    textAlign: "center",
  },

  cancel: { paddingVertical: spacing.xs, alignItems: "center" },
  cancelText: { fontSize: 17, fontFamily: font.uiBold, color: colors.softInk },
});
