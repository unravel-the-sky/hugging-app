// components/postcard/StickerSheet.tsx
//
// Bottom sheet grid of Ionicons stickers. Tap drops one onto the postcard at
// centre; it then behaves like any overlay (drag / pinch / rotate).

import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, font, radius } from "@/components/ui/squish/theme";
import { STICKERS } from "@/lib/postcardEditConstants";

export default function StickerSheet({
  onPick,
  onClose,
}: {
  onPick: (icon: keyof typeof Ionicons.glyphMap, color: string) => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <Text style={styles.title}>Stickers</Text>
        </View>
        <Pressable hitSlop={12} onPress={onClose} style={styles.close}>
          <Ionicons name="close" size={18} color={colors.softInk} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {STICKERS.map((s) => (
          <Pressable
            key={s.icon}
            style={styles.cell}
            onPress={() => onPick(s.icon, s.color)}
          >
            <Ionicons name={s.icon} size={34} color={s.color} />
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.hint}>tap a sticker to drop it on your photo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.mistBg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    maxHeight: 360,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: font.displayBold, fontSize: 18, color: colors.plumInk },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  cell: {
    width: "22%",
    aspectRatio: 1,
    backgroundColor: colors.soft,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    textAlign: "center",
    marginTop: 12,
    color: colors.softInk,
    fontFamily: font.ui,
    fontSize: 13,
  },
});
