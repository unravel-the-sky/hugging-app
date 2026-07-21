import { PlushButton } from "@/components/ui/squish/PlushButton";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  colors,
  font,
  radius,
  shadow,
  spacing,
  tint,
} from "../components/ui/squish";
import { useHugDraft } from "../hooks/useHugDraft";
import { useGetDownloadUrl } from "@/hooks/useGetDownloadUrl";
import { useAvatarThumb } from "@/hooks/useAvatarThumbnail";
import { FriendAvatar } from "@/components/ui/squish/FriendAvatar";

const NOTE_MAX_LENGTH = 40;

const inkFaint = tint(colors.softInk, 0.25);
const pinkSoft = tint(colors.blush, 0.82);
const dashedBorder = tint(colors.lilac, 0.4);

export default function HugNoteModal() {
  const note = useHugDraft((s) => s.note);
  const photoUri = useHugDraft((s) => s.photoUri);
  const friendUid = useHugDraft((s) => s.to);
  const friendName = useHugDraft((s) => s.toName);
  const setNote = useHugDraft((s) => s.setNote);
  const setTo = useHugDraft((s) => s.setTo);
  const setToName = useHugDraft((s) => s.setToName);
  const reset = useHugDraft((s) => s.reset);

  // Local-only editing state for the note card.
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState("");

  useEffect(() => {
    reset();
  }, [reset]);

  const hasNote = note.trim().length > 0;
  const hasPhoto = !!photoUri;
  const hasExtras = hasNote || hasPhoto;

  const { downloadUrl } = useGetDownloadUrl(photoUri);

  const openNoteEditor = () => {
    setDraftNote(note);
    setIsEditingNote(true);
  };

  const saveNote = () => {
    setNote(draftNote.trim());
    setIsEditingNote(false);
  };

  const cancelNoteEdit = () => {
    setDraftNote(note);
    setIsEditingNote(false);
  };

  const handleAddPostcard = () => {
    router.push({
      pathname: "/take-pic",
    });
  };

  const handleSend = () => {
    setTo(friendUid);
    setToName(friendName);
    setNote(note.trim());
    console.log("i am sending hug");
    router.push({
      pathname: "/send-hug",
    });
  };

  const handleClose = () => {
    router.back();
  };

  const avatarUri = useAvatarThumb(friendUid);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backButton} onPress={handleClose} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <View style={styles.header}>
          <FriendAvatar name={friendName} photoUri={avatarUri ?? undefined} />
          <Text style={styles.title}>New hug</Text>
          <Text style={styles.subtitle}>to {friendName}</Text>
        </View>

        <Text style={styles.sectionLabel}>MAKE IT EXTRA</Text>

        {isEditingNote ? (
          <View style={styles.editorCard}>
            <TextInput
              style={styles.textInput}
              placeholder="a few words for the hug"
              placeholderTextColor={inkFaint}
              value={draftNote}
              onChangeText={setDraftNote}
              multiline
              autoFocus
              maxLength={NOTE_MAX_LENGTH}
              textAlignVertical="top"
            />
            <View style={styles.editorFooter}>
              <Text style={styles.charCount}>
                {draftNote.length} / {NOTE_MAX_LENGTH}
              </Text>
              <View style={styles.editorActions}>
                <TouchableOpacity
                  style={[styles.pill, styles.pillGhost]}
                  onPress={cancelNoteEdit}
                >
                  <Text style={styles.pillGhostText}>cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, styles.pillSolid]}
                  onPress={saveNote}
                >
                  <Text style={styles.pillSolidText}>add text</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : hasNote ? (
          <Pressable
            style={[styles.card, styles.cardFilledNote]}
            onPress={openNoteEditor}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconBox, styles.iconBoxNote]}>
                <Text style={styles.iconGlyph}>✏️</Text>
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>Note added</Text>
                <Text style={styles.cardHint}>tap to edit</Text>
              </View>
              <View style={styles.check}>
                <Text style={styles.checkGlyph}>✓</Text>
              </View>
            </View>
            <Text style={styles.notePreview} numberOfLines={3}>
              “{note.trim()}”
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.card, styles.cardEmpty]}
            onPress={openNoteEditor}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconBox, styles.iconBoxNoteSoft]}>
                <Text style={styles.iconGlyph}>✏️</Text>
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>Add a note</Text>
                <Text style={styles.cardHint}>add a few words</Text>
              </View>
              <Text style={styles.plus}>＋</Text>
            </View>
          </Pressable>
        )}

        {hasPhoto && downloadUrl ? (
          <Pressable
            style={[styles.card, styles.cardFilledPostcard]}
            onPress={handleAddPostcard}
          >
            <View style={styles.cardRow}>
              <Image source={{ uri: downloadUrl }} style={styles.thumb} />
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>Postcard added</Text>
                <Text style={styles.cardHint}>one photo · tap to change</Text>
              </View>
              <View style={styles.check}>
                <Text style={styles.checkGlyph}>✓</Text>
              </View>
            </View>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.card, styles.cardEmpty]}
            onPress={handleAddPostcard}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconBox, styles.iconBoxPostcardSoft]}>
                <Text style={styles.iconGlyph}>🖼️</Text>
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>Add a postcard</Text>
                <Text style={styles.cardHint}>a photo card to unwrap</Text>
              </View>
              <Text style={styles.plus}>＋</Text>
            </View>
          </Pressable>
        )}
      </ScrollView>

      {!isEditingNote && (
        <View style={styles.footer}>
          <PlushButton label="send hug" onPress={handleSend} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mistBg,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
    shadowOpacity: 0.12,
    elevation: 2,
  },
  backArrow: {
    fontSize: 22,
    color: colors.plumInk,
    marginTop: -2,
  },
  header: {
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: colors.blush,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: pinkSoft,
  },
  avatarText: {
    fontSize: 34,
    fontFamily: font.displayBold,
    color: colors.surface,
  },
  title: {
    fontSize: 24,
    fontFamily: font.displayBold,
    color: colors.plumInk,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: font.ui,
    color: colors.softInk,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: font.uiBold,
    letterSpacing: 1,
    color: inkFaint,
    marginTop: spacing.xs,
  },

  // Cards (shared)
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardEmpty: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: dashedBorder,
    backgroundColor: colors.surface,
  },
  cardFilledNote: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.soft,
    gap: spacing.md,
  },
  cardFilledPostcard: {
    borderWidth: 2,
    borderColor: colors.blush,
    backgroundColor: pinkSoft,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md + 2,
  },
  cardTextWrap: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: font.uiBold,
    color: colors.plumInk,
  },
  cardHint: {
    fontSize: 13,
    fontFamily: font.ui,
    color: colors.softInk,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxNote: { backgroundColor: colors.primary },
  iconBoxNoteSoft: { backgroundColor: colors.soft },
  iconBoxPostcardSoft: { backgroundColor: pinkSoft },
  iconGlyph: { fontSize: 22 },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.soft,
  },
  plus: {
    fontSize: 22,
    color: inkFaint,
    fontFamily: font.uiBold,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  checkGlyph: {
    color: colors.surface,
    fontSize: 15,
    fontFamily: font.uiBold,
  },
  notePreview: {
    fontSize: 16,
    color: colors.plumInk,
  },

  // Note editor
  editorCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.soft,
    gap: spacing.md,
  },
  textInput: {
    fontSize: 16,
    fontFamily: font.ui,
    color: colors.plumInk,
    minHeight: 58,
    maxHeight: 180,
  },
  editorFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  charCount: {
    fontSize: 12,
    fontFamily: font.ui,
    color: inkFaint,
  },
  editorActions: {
    flexDirection: "row",
    gap: spacing.sm + 2,
  },
  pill: {
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  pillGhost: {
    backgroundColor: colors.soft,
  },
  pillGhostText: {
    color: colors.primary,
    fontFamily: font.uiBold,
    fontSize: 14,
  },
  pillSolid: {
    backgroundColor: colors.primary,
  },
  pillSolidText: {
    color: colors.surface,
    fontFamily: font.uiBold,
    fontSize: 14,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? 36 : spacing.xl,
    gap: spacing.md,
  },
  footerCaption: {
    textAlign: "center",
    fontSize: 18,
    fontFamily: font.hand,
    color: colors.softInk,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: "center",
    ...shadow,
  },
  sendButtonText: {
    color: colors.surface,
    fontSize: 17,
    fontFamily: font.displayBold,
  },
});
