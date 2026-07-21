import AvatarImage from "@/components/avatar/AvatarImage";
import { colors, font, radius, spacing, tint } from "@/components/ui/squish";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { pickAvatarFromLibrary } from "@/lib/avatarPhoto";
import { updateUserAvatar } from "@/lib/createUser";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type DrawnAvatar = "male" | "female";

const squishOptions: { type: DrawnAvatar; label: string }[] = [
  { type: "male", label: "zhis" },
  { type: "female", label: "zhat" },
];

export default function ChangeAvatarSheet() {
  const { user } = useCurrentUser();

  // null = nothing selected yet. Photo users open with no squish
  // highlighted; save stays disabled until they actually pick one.
  const [selected, setSelected] = useState<DrawnAvatar | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Pre-select the current squish only if they're already on one.
    // On a photo (or no avatar), leave the grid unselected.
    if (user && user.avatar !== "photo") {
      setSelected((user.avatar as DrawnAvatar) || "male");
    }
  }, [user]);

  // Dirty only once a squish is picked AND it differs from what's saved.
  // For a photo user, any pick differs; for a squish user, it must change.
  const dirty =
    selected !== null &&
    (user?.avatar === "photo" || selected !== user?.avatar);

  const busy = saving || uploading;

  const handleSaveSquish = async () => {
    if (!selected) return; // button is disabled in this state, but be safe
    setSaving(true);
    try {
      await updateUserAvatar(selected);
      router.back();
    } catch (e) {
      console.error("Error saving avatar:", e);
      Alert.alert("Hmm", "Couldn't save your avatar. Try again?");
    } finally {
      setSaving(false);
    }
  };

  const handleCamera = () => {
    router.back();
    router.push("/avatar-camera");
  };

  const handleLibrary = async () => {
    setUploading(true);
    try {
      const result = await pickAvatarFromLibrary({
        photoPath: user?.photoPath,
        photoThumbPath: user?.photoThumbPath,
      });
      if (result) router.back(); // null = user cancelled the picker
    } catch (e) {
      console.error("Photo upload failed:", e);
      Alert.alert("Hmm", "Couldn't upload your picture. Try again?");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={styles.content}
      bounces={false}
    >
      <Text style={styles.title}>change avatar</Text>

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
              <AvatarImage avatar={opt.type} size="m" />
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
        onPress={handleCamera}
      />
      <PlushButton
        label={uploading ? "uploading…" : "choose from library"}
        variant="soft"
        fullWidth
        disabled={busy}
        onPress={handleLibrary}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.surface },
  content: {
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
