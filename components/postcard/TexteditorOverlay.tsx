// components/postcard/TextEditorOverlay.tsx
//
// Full-screen editor. The centred text IS the input (live preview), styled with
// the chosen font/size/colour. Bottom bar has: font dropdown, triangle size
// slider, colour swatches, Done. No separate "type your note" box.
//
// Done commits to the overlay list at canvas centre; tapping an existing text
// re-opens it seeded with its props.

import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  TextInput,
} from "react-native-gesture-handler";

import { PlushButton } from "@/components/ui/squish/PlushButton";
import { colors, font, radius } from "@/components/ui/squish/theme";
import {
  FONT_OPTIONS,
  FontKey,
  fontFamilyFor,
  SWATCHES,
} from "../../lib/postcardEditConstants";

export type TextDraft = {
  id?: string; // present when editing
  text: string;
  fontKey: FontKey;
  size: number;
  color: string;
};

const SIZE_MIN = 16;
const SIZE_MAX = 72;
const SLIDER_W = Dimensions.get("window").width - 32 - 120; // minus label area
const SLIDER_H = 40;

export default function TextEditorOverlay({
  draft,
  onCancel,
  onDone,
}: {
  draft: TextDraft;
  onCancel: () => void;
  onDone: (draft: TextDraft) => void;
}) {
  const [text, setText] = useState(draft.text);
  const [fontKey, setFontKey] = useState<FontKey>(draft.fontKey);
  const [size, setSize] = useState(draft.size);
  const [color, setColor] = useState(draft.color);
  const [fontOpen, setFontOpen] = useState(false);

  const commit = () => {
    if (text.trim() === "") {
      onCancel();
      return;
    }
    onDone({ id: draft.id, text, fontKey, size, color });
  };

  // Triangle size slider — pan across the width maps to font size.
  const setSizeFromX = (x: number) => {
    const clamped = Math.min(Math.max(x, 0), SLIDER_W);
    const t = clamped / SLIDER_W;
    setSize(Math.round(SIZE_MIN + t * (SIZE_MAX - SIZE_MIN)));
  };
  const slide = Gesture.Pan()
    .onBegin((e) => setSizeFromX(e.x))
    .onUpdate((e) => setSizeFromX(e.x))
    .runOnJS(true);

  const knobX = ((size - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)) * SLIDER_W - 14;

  return (
    <View style={styles.root}>
      {/* Scrim + centred live text. Tapping the scrim commits. */}
      <Pressable style={styles.scrim} onPress={commit}>
        <View style={styles.stage} pointerEvents="box-none">
          <View style={styles.textFrame}>
            <TextInput
              autoFocus
              multiline
              value={text}
              onChangeText={setText}
              maxLength={80}
              placeholder="your note"
              placeholderTextColor="rgba(255,255,255,0.55)"
              style={{
                color,
                fontFamily: fontFamilyFor(fontKey),
                fontSize: size,
                textAlign: "center",
                minWidth: 120,
              }}
            />
          </View>
        </View>
      </Pressable>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.controlHeader}>
          <View style={styles.titleRow}>
            <Ionicons name="text" size={18} color={colors.primary} />
            <Text style={styles.title}>Text</Text>
          </View>
          <PlushButton
            label="Done"
            onPress={commit}
            height={44}
            icon={
              <Ionicons name="checkmark" size={18} color={colors.surface} />
            }
          />
        </View>

        <View style={styles.row}>
          {/* Font dropdown */}
          <View style={styles.fontCol}>
            <Text style={styles.fieldLabel}>FONT</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setFontOpen((o) => !o)}
            >
              <Text
                style={{
                  fontFamily: fontFamilyFor(fontKey),
                  fontSize: 18,
                  color: colors.plumInk,
                }}
              >
                {FONT_OPTIONS.find((f) => f.key === fontKey)?.label}
              </Text>
              <Ionicons
                name={fontOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.softInk}
              />
            </Pressable>

            {fontOpen && (
              <View style={styles.popover}>
                {FONT_OPTIONS.map((f) => {
                  const active = f.key === fontKey;
                  return (
                    <Pressable
                      key={f.key}
                      style={[styles.option, active && styles.optionActive]}
                      onPress={() => {
                        setFontKey(f.key);
                        setFontOpen(false);
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: f.family,
                          fontSize: 18,
                          color: colors.plumInk,
                        }}
                      >
                        {f.label}
                      </Text>
                      {active && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={colors.primary}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Triangle size slider */}
          <View style={styles.sizeCol}>
            <View style={styles.sizeHeader}>
              <Text style={styles.fieldLabel}>SIZE</Text>
              <Text style={styles.sizeValue}>{size}</Text>
            </View>
            <GestureDetector gesture={slide}>
              <View style={styles.sliderTrack}>
                {/* triangle fill (grows left→right) */}
                <View style={styles.triangle} />
                <View style={[styles.knob, { left: knobX }]}>
                  <Text style={styles.knobA}>A</Text>
                </View>
              </View>
            </GestureDetector>
          </View>
        </View>

        {/* Swatches */}
        <View style={styles.swatches}>
          {SWATCHES.map((c) => {
            const active = c === color;
            return (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  active && styles.swatchActive,
                  c === colors.surface && styles.swatchBordered,
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.82)",
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 220,
  },
  textFrame: {
    borderColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.mistBg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: 16,
  },
  controlHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: font.displayBold, fontSize: 18, color: colors.plumInk },
  row: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  fontCol: { width: 150 },
  sizeCol: { flex: 1 },
  fieldLabel: {
    fontFamily: font.uiBold,
    fontSize: 11,
    color: colors.softInk,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dropdown: {
    height: 48,
    backgroundColor: colors.soft,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  popover: {
    position: "absolute",
    bottom: 56,
    left: 0,
    right: 0,
    backgroundColor: "#3A3450",
    borderRadius: radius.md,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionActive: { backgroundColor: "rgba(255,255,255,0.08)" },
  sizeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sizeValue: {
    fontFamily: font.displayBold,
    fontSize: 16,
    color: colors.plumInk,
    marginBottom: 6,
  },
  sliderTrack: {
    height: SLIDER_H,
    justifyContent: "center",
  },
  triangle: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: SLIDER_H / 2 - 10,
    height: 0,
    borderStyle: "solid",
    borderRightWidth: SLIDER_W,
    borderTopWidth: 20,
    borderRightColor: colors.lilac,
    borderTopColor: "transparent",
  },
  knob: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    top: SLIDER_H / 2 - 14,
  },
  knobA: { color: "white", fontFamily: font.displayBold, fontSize: 14 },
  swatches: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: "white",
  },
  swatchBordered: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
});
