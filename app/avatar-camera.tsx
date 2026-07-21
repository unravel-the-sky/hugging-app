import { colors, font, spacing } from "@/components/ui/squish";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { saveAvatarPhoto } from "@/lib/avatarPhoto";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import TakePicture from "./take-pic";

export default function AvatarCameraScreen() {
  const { user } = useCurrentUser();
  const [uploading, setUploading] = useState(false);

  const handleConfirm = async (uri: string) => {
    setUploading(true);
    try {
      await saveAvatarPhoto(uri, {
        photoPath: user?.photoPath,
        photoThumbPath: user?.photoThumbPath,
      });
      router.back(); // → profile, which re-renders live via useCurrentUser
    } catch (e) {
      console.error("Avatar upload failed:", e);
      Alert.alert("Hmm", "Couldn't upload your picture. Try again?");
    } finally {
      setUploading(false);
    }
  };

  return (
    <TakePicture
      defaultFacing="front" // selfie mode for avatars
      circularGuide // frame the face inside the circle it'll become
      renderPreview={(uri, onRetake) => (
        <AvatarConfirm
          uri={uri}
          uploading={uploading}
          onConfirm={() => handleConfirm(uri)}
          onRetake={onRetake}
        />
      )}
    />
  );
}

/** Round preview — shows the picture the way it'll actually appear. */
function AvatarConfirm({
  uri,
  uploading,
  onConfirm,
  onRetake,
}: {
  uri: string;
  uploading: boolean;
  onConfirm: () => void;
  onRetake: () => void;
}) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - spacing.xl * 4, 280);

  return (
    <View style={styles.confirm}>
      <Text style={styles.title}>looking good?</Text>
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
      <View style={styles.actions}>
        <PlushButton
          label={uploading ? "uploading…" : "use this picture"}
          variant="primary"
          fullWidth
          disabled={uploading}
          onPress={onConfirm}
        />
        <PlushButton
          label="retake"
          variant="soft"
          fullWidth
          disabled={uploading}
          onPress={onRetake}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  confirm: {
    flex: 1,
    backgroundColor: colors.mistBg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontFamily: font.displayBold,
    color: colors.plumInk,
  },
  actions: {
    alignSelf: "stretch",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
