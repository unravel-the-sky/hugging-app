import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { TextInput } from "react-native-gesture-handler";

import { PlushButton } from "@/components/ui/squish/PlushButton";
import { colors, font, radius, spacing } from "@/components/ui/squish/theme";
import {
  FONT_OPTIONS,
  fontFamilyFor,
  FontKey,
  SWATCHES,
} from "@/constants/postcardEditorConstants";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type TextDraft = {
  id?: string; // present when editing
  text: string;
  fontKey: FontKey;
  size: number;
  color: string;
};

export default function TextEditorOverlay({
  draft,
  swatches = SWATCHES,
  onCancel,
  onDone,
}: {
  draft: TextDraft;
  /**
   * Colour choices, in the order they're shown. The editor takes them from the
   * caller rather than reading `SWATCHES` itself, so the postcard can put the
   * photo's own colours at the front of the row.
   */
  swatches?: string[];
  onCancel: () => void;
  onDone: (draft: TextDraft) => void;
}) {
  const [text, setText] = useState(draft.text);
  const [fontKey, setFontKey] = useState<FontKey>(draft.fontKey);
  const [color, setColor] = useState(draft.color);
  const [kb, setKb] = useState(0);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(showEvt, (e) =>
      setKb(e.endCoordinates?.height ?? 0),
    );
    const h = Keyboard.addListener(hideEvt, () => setKb(0));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  const commit = () => {
    if (text.trim() === "") {
      onCancel();
      return;
    }
    onDone({ id: draft.id, text, fontKey, size: draft.size, color });
  };

  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.root, { marginTop: Math.max(insets.top, spacing.lg) }]}
    >
      {/* Dim area + centred live text. Tapping the dim area commits. */}
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
                fontSize: draft.size,
                textAlign: "center",
                width: "100%",
              }}
            />
          </View>
        </View>
      </Pressable>

      {/* Toolbar — pinned just above the keyboard */}
      <View style={[styles.bar]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.fontRow}
        >
          {FONT_OPTIONS.map((f) => {
            const active = f.key === fontKey;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFontKey(f.key)}
                style={[styles.fontChip, active && styles.fontChipActive]}
              >
                <Text
                  style={{
                    fontFamily: f.family,
                    fontSize: 18,
                    color: active ? colors.surface : colors.plumInk,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.bottomRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={styles.swatchRow}
          >
            {swatches.map((c) => {
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
          </ScrollView>

          <PlushButton
            label="Done"
            onPress={commit}
            height={44}
            icon={
              <Ionicons name="checkmark" size={18} color={colors.surface} />
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 20 },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.82)",
  },
  stage: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 120,
  },
  textFrame: {
    // borderColor: "rgba(255,255,255,0.5)",
    // borderWidth: 1,
    // borderStyle: "dashed",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "stretch",
    marginHorizontal: 24,
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: colors.mistBg,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: 10,
  },
  fontRow: {
    paddingHorizontal: 14,
    gap: 8,
    alignItems: "center",
  },
  fontChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.soft,
  },
  fontChipActive: {
    backgroundColor: colors.lilac,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 12,
  },
  swatchRow: {
    gap: 10,
    alignItems: "center",
    paddingRight: 4,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  swatchBordered: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
});
