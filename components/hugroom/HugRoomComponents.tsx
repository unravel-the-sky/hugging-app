import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  avatarColors,
  colors,
  font,
  radius,
  spacing,
} from "@/components/ui/squish/theme";

/** Stable per-person colour so the same friend keeps the same bubble. */
const BUBBLE_COLORS = [
  avatarColors.mint,
  avatarColors.primary,
  avatarColors.blush,
  avatarColors.peach,
  avatarColors.butter,
] as const;

export function bubbleColor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return BUBBLE_COLORS[h % BUBBLE_COLORS.length];
}

export function BackLink() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={styles.back}
    >
      <Ionicons name="chevron-back" size={18} color={colors.primary} />
      <Text style={styles.backLabel}>back</Text>
    </Pressable>
  );
}

export function AvatarBubble({
  uid,
  displayName,
  photoThumbURL,
  size = 120,
  connected,
}: {
  uid: string;
  displayName: string;
  photoThumbURL?: string | null;
  size?: number;
  connected?: boolean;
}) {
  const dot = Math.round(size * 0.2);
  return (
    <View style={{ width: size, height: size }}>
      {photoThumbURL ? (
        <Image
          source={{ uri: photoThumbURL }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View
          style={[
            styles.initialBubble,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bubbleColor(uid),
            },
          ]}
        >
          <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
            {displayName.trim().charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
      )}

      {connected !== undefined ? (
        <View
          style={[
            styles.presenceDot,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: connected ? colors.mint : colors.lilac,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export const screen = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mistBg,
    paddingHorizontal: 46,
  },
  title: {
    fontFamily: font.displayBold,
    fontSize: 34,
    color: colors.plumInk,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: font.ui,
    fontSize: 16,
    lineHeight: 24,
    color: colors.softInk,
    textAlign: "center",
    marginTop: spacing.md,
  },
  caption: {
    fontFamily: font.ui,
    fontSize: 14,
    color: colors.softInk,
    textAlign: "center",
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    shadowColor: colors.deep,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});

const styles = StyleSheet.create({
  back: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
  },
  backLabel: {
    fontFamily: font.uiBold,
    fontSize: 17,
    color: colors.primary,
    marginLeft: 2,
  },
  initialBubble: { alignItems: "center", justifyContent: "center" },
  initial: {
    fontFamily: font.displayBold,
    color: colors.surface,
  },
  presenceDot: {
    position: "absolute",
    right: 0,
    bottom: 4,
    borderWidth: 3,
    borderColor: colors.mistBg,
  },
});
