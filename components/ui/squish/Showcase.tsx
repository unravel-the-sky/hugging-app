import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  colors,
  font,
  HugTypeKey,
  IconButton,
  iconButtonTint,
  PlushButton,
} from "./index";
import Avatar, { CoupleAvatar } from "./Avatar";

/**
 * Demo / smoke-test screen. Icons here are emoji placeholders to show layout —
 * swap them for nodes from your icon library (lucide-react-native, @expo/vector-icons, etc.).
 */
export default function ShowcaseScreen() {
  const [selected, setSelected] = useState<HugTypeKey>("bear");
  const chipTypes: HugTypeKey[] = [
    "bear",
    "squeeze",
    "morning",
    "night",
    "cuddle",
    "cheer",
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.mistBg }}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.h1}>Squish</Text>

      <Text style={styles.section}>PLUSH BUTTONS</Text>
      <View style={styles.row}>
        <PlushButton
          label="Send hug"
          variant="primary"
          icon={<Glyph>➤</Glyph>}
        />
        <PlushButton label="Hug back" variant="blush" icon={<Glyph>♡</Glyph>} />
        <PlushButton label="Maybe later" variant="soft" />
      </View>
      <View style={styles.row}>
        <IconButton
          variant="primary"
          icon={<Glyph color={iconButtonTint("primary")}>＋</Glyph>}
        />
        <IconButton
          variant="blush"
          icon={<Glyph color={iconButtonTint("blush")}>♡</Glyph>}
        />
        <IconButton
          variant="surface"
          icon={<Glyph color={iconButtonTint("surface")}>◉</Glyph>}
        />
      </View>

      <Text style={styles.section}>AVATARS & COUPLE UNIT</Text>
      <View style={styles.row}>
        <Avatar initials="M" color={colors.lilac} />
        <Avatar initials="J" color={colors.blush} />
        <Avatar face="happy" color={colors.mint} />
        <Avatar face="happy" color={colors.peach} />
        <CoupleAvatar
          left={{ initials: "M", color: colors.lilac }}
          right={{ initials: "J", color: colors.blush }}
        />
      </View>

      <Text style={styles.section}>HUG-TYPE CHIPS</Text>
    </ScrollView>
  );
}

export function Glyph({
  children,
  color = "#FFFFFF",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return <Text style={{ color, fontSize: 16 }}>{children}</Text>;
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 14 },
  h1: {
    fontFamily: font.displayBold,
    fontWeight: "700",
    fontSize: 34,
    color: colors.plumInk,
  },
  section: {
    fontFamily: font.uiBold,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.softInk,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
