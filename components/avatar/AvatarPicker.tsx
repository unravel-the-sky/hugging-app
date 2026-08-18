import { useCurrentUser } from "@/hooks/useCurrentUser";
import { pickAvatarFromLibrary } from "@/lib/avatarPhoto";
import { updateUserAvatar } from "@/lib/createUser";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font, radius, spacing, tint } from "../ui/squish";
import AvatarImage from "./AvatarImage";
import { PlushButton } from "../ui/squish/PlushButton";

type DrawnAvatar = "male" | "female";

type AvatarPickerProps = {
  title: string;
  saveLabel?: string;
  onSaved: () => void; // squish saved, or photo uploaded
  onOpenCamera: () => void; // caller decides how to get there and back
};

const squishOptions: { type: DrawnAvatar; label: string }[] = [
  { type: "male", label: "zhis" },
  { type: "female", label: "zhat" },
];

export default function AvatarPicker({
  title,
  saveLabel = "save avatar",
  onSaved,
  onOpenCamera,
}: AvatarPickerProps) {
  const { user } = useCurrentUser();
  const [selected, setSelected] = useState<DrawnAvatar | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // only pre-select when they already have a drawn avatar
    if (user?.avatar && user.avatar !== "photo") {
      setSelected(user.avatar as DrawnAvatar);
    }
  }, [user?.avatar]);

  const dirty = selected !== null && selected !== user?.avatar;
  const busy = saving || uploading;

  const handleSaveSquish = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateUserAvatar(selected);
      onSaved();
    } catch (e) {
      console.error("Error saving avatar:", e);
      Alert.alert("hmm", "couldn't save your avatar. try again?");
    } finally {
      setSaving(false);
    }
  };

  const handleLibrary = async () => {
    setUploading(true);
    try {
      const result = await pickAvatarFromLibrary({
        photoPath: user?.photoPath,
        photoThumbPath: user?.photoThumbPath,
      });
      if (result) onSaved();
    } catch (e) {
      /* … */
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.content}>
      <Text style={styles.title}>choose avatar</Text>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>pick an avatar</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.grid}>
        {squishOptions.map((opt) => {
          const active = selected === opt.type;
          return (
            <Pressable
              key={opt.type}
              style={[styles.option, active && styles.optionSelected]}
              onPress={() => setSelected(opt.type)}
              disabled={busy}
            >
              <AvatarImage isDrawn avatar={opt.type} size="m" />
              <Text
                style={[
                  styles.optionLabel,
                  active && styles.optionLabelSelected,
                ]}
              >
                {opt.label}
              </Text>
              {active && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <PlushButton
        label={saving ? "saving…" : "save avatar"}
        variant="primary"
        fullWidth
        disabled={busy || !dirty}
        onPress={handleSaveSquish}
      />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or use a photo</Text>
        <View style={styles.dividerLine} />
      </View>

      <PlushButton
        label="take a picture"
        variant="soft"
        fullWidth
        disabled={busy}
        onPress={onOpenCamera}
      />
      <PlushButton
        label={uploading ? "loading" : "choose from library"}
        variant="soft"
        fullWidth
        disabled={busy}
        onPress={handleLibrary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.surface },
  content: {
    marginTop: 50,
    flex: 1,
    padding: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: font.displayBold,
    color: colors.plumInk,
    textAlign: "center",
  },
  eyebrow: {
    fontSize: 13,
    fontFamily: font.uiBold,
    color: colors.softInk,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", gap: spacing.lg },
  option: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.soft,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: tint(colors.primary, 0.88),
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: font.uiBold,
    color: colors.softInk,
  },
  optionLabelSelected: { color: colors.primary },
  badge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: colors.surface,
    fontSize: 14,
    fontFamily: font.uiBold,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.soft },
  dividerText: {
    fontSize: 15,
    fontFamily: font.ui,
    color: colors.softInk,
  },
});
