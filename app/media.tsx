import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { useSharedValue } from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";

import FilterPreview from "@/components/postcard/FilterPreview";
import PostImage from "@/components/postcard/PostImage";
import DraggableOverlay from "@/components/postcard/DraggableOverlay";
import FineTunePad from "@/components/postcard/FinetunePad";
import StickerSheet from "@/components/postcard/StickerSheet";
import TextEditorOverlay, {
  TextDraft,
} from "@/components/postcard/TexteditorOverlay";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { colors, font } from "@/components/ui/squish/theme";

import { FilterKey, filterKeys, FILTERS } from "@/constants/postcardConstants";
import {
  newOverlayId,
  Overlay,
  STICKER_BASE_SIZE,
} from "../lib/postcardEditConstants";

import { useImageColors } from "@/hooks/useImageColors";
import { useHugDraft } from "@/hooks/useHugDraft";
import usePolaroidFrameCalc from "@/hooks/usePolaroidFrameCalc";

import { auth, storage } from "@/lib/firebaseConfig";
import { useImage } from "@shopify/react-native-skia";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const getPixelSize = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject),
  );

type Sheet = "none" | "tune" | "stickers";

const emptyTuning = () =>
  filterKeys.reduce(
    (acc, k) => ({ ...acc, [k]: { hue: 0, light: 0 } }),
    {} as Record<FilterKey, { hue: number; light: number }>,
  );

export default function Media({
  media,
  onBack,
}: {
  media: string;
  onBack: () => void;
}) {
  const image = useImage(media);
  const imageRef = useRef(null);
  const setPhoto = useHugDraft((s) => s.setPhotoUri);

  const { canvasWidth, canvasHeight, canvasPadding, frameWidth, frameHeight } =
    usePolaroidFrameCalc();

  // ---- filters + tuning ------------------------------------------------
  const [selected, setSelected] = useState<FilterKey>("normal");
  const [tuning, setTuning] = useState(emptyTuning);
  const hue = useSharedValue(0);
  const light = useSharedValue(0);

  const seedTuning = (key: FilterKey) => {
    hue.value = tuning[key].hue;
    light.value = tuning[key].light;
  };

  const selectFilter = (key: FilterKey) => {
    setSelected(key);
    seedTuning(key);
  };

  // ---- sheets + overlays ----------------------------------------------
  const [sheet, setSheet] = useState<Sheet>("none");
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TextDraft | null>(null);
  const [saving, setSaving] = useState(false);

  // ---- fine tune -------------------------------------------------------
  const openTune = (key: FilterKey) => {
    selectFilter(key);
    setSelectedId(null);
    setSheet("tune");
  };
  const tuneDone = () => {
    setTuning((t) => ({
      ...t,
      [selected]: { hue: hue.value, light: light.value },
    }));
    setSheet("none");
  };
  const tuneReset = () =>
    setTuning((t) => ({ ...t, [selected]: { hue: 0, light: 0 } }));

  // ---- text ------------------------------------------------------------
  const addText = () => {
    setSelectedId(null);
    setEditing({
      text: "",
      fontKey: "caveat",
      size: 40,
      color: colors.surface,
    });
  };

  const editorDone = (draft: TextDraft) => {
    if (draft.id) {
      setOverlays((list) =>
        list.map((o) =>
          o.id === draft.id && o.kind === "text"
            ? {
                ...o,
                text: draft.text,
                fontKey: draft.fontKey,
                size: draft.size,
                color: draft.color,
              }
            : o,
        ),
      );
    } else {
      setOverlays((list) => [
        ...list,
        {
          id: newOverlayId(),
          kind: "text",
          text: draft.text,
          fontKey: draft.fontKey,
          size: draft.size,
          color: draft.color,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
        },
      ]);
    }
    setEditing(null);
  };

  // ---- stickers --------------------------------------------------------
  const addSticker = (icon: keyof typeof Ionicons.glyphMap, color: string) => {
    setOverlays((list) => [
      ...list,
      {
        id: newOverlayId(),
        kind: "sticker",
        icon,
        color,
        size: STICKER_BASE_SIZE,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
      },
    ]);
    setSheet("none");
  };

  // ---- overlay callbacks ----------------------------------------------
  const onOverlayTap = (o: Overlay) => {
    setSelectedId(o.id);
    if (o.kind === "text") {
      setEditing({
        id: o.id,
        text: o.text,
        fontKey: o.fontKey,
        size: o.size,
        color: o.color,
      });
    }
  };

  const updateOverlay = (
    id: string,
    next: { x: number; y: number; scale: number; rotation: number },
  ) =>
    setOverlays((list) =>
      list.map((o) => (o.id === id ? { ...o, ...next } : o)),
    );

  const deleteOverlay = (id: string) => {
    setOverlays((list) => list.filter((o) => o.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  // ---- capture ---------------------------------------------------------
  const captureCropped = async () => {
    // Drop selection chrome so the dashed border / × aren't baked in.
    setSelectedId(null);
    await new Promise((r) => setTimeout(r, 60));

    const captureUri = await captureRef(imageRef, {
      format: "jpg",
      quality: 0.9,
      result: "tmpfile",
    });
    if (!captureUri) throw new Error("Capture failed");

    const { width: capW, height: capH } = await getPixelSize(captureUri);
    const scaleX = capW / canvasWidth;
    const scaleY = capH / canvasHeight;

    const originX = Math.round(canvasPadding * scaleX);
    const originY = Math.round(canvasPadding * scaleY);
    const cropW = Math.min(Math.round(frameWidth * scaleX), capW - originX);
    const cropH = Math.min(Math.round(frameHeight * scaleY), capH - originY);

    const context = ImageManipulator.ImageManipulator.manipulate(
      captureUri,
    ).crop({ originX, originY, width: cropW, height: cropH });

    const rendered = await context.renderAsync();
    const cropped = await rendered.saveAsync({
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.7,
    });
    return cropped.uri;
  };

  // Top-right: save to device only.
  const handleSaveToDevice = async () => {
    try {
      setSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow photo library access to save.");
        return;
      }
      const uri = await captureCropped();
      await MediaLibrary.saveToLibraryAsync(uri);
    } catch (err) {
      console.error("Error saving image:", err);
    } finally {
      setSaving(false);
    }
  };

  // "add it!": upload and attach to the hug (no auto device-save).
  const handleAddToHug = async () => {
    try {
      setSaving(true);
      const uri = await captureCropped();

      const response = await fetch(uri);
      const blob = await response.blob();

      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("not signed in");

      const imgName = `polaroid-hug-${Date.now()}`;
      const storageRef = ref(storage, `images/${uid}/${imgName}`);

      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: "image/jpeg",
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);

      setPhoto(downloadUrl);
      router.back();
    } catch (err) {
      console.error("Error adding image to hug:", err);
    } finally {
      setSaving(false);
    }
  };

  // ---- colours ---------------------------------------------------------
  const { colors: imageColors } = useImageColors(media);
  const bg = imageColors?.colorOne?.value ?? "#D7C2B2";

  if (!image) return null;

  const selectedFilterName = FILTERS[selected].name;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.plumInk} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit</Text>
        <Pressable
          onPress={handleSaveToDevice}
          style={styles.headerBtn}
          hitSlop={8}
          disabled={saving}
        >
          <Ionicons name="download-outline" size={22} color={colors.plumInk} />
        </Pressable>
      </View>

      {/* Postcard + overlays */}
      <View style={styles.stage}>
        <View
          ref={imageRef}
          collapsable={false}
          style={{ width: canvasWidth, height: canvasHeight }}
        >
          <PostImage
            media={media}
            selected={selected}
            hue={hue}
            light={light}
          />

          {/* tap empty area to deselect */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedId(null)}
          />

          {overlays.map((o) => (
            <DraggableOverlay
              key={o.id}
              overlay={o}
              selected={selectedId === o.id}
              onTap={onOverlayTap}
              onChange={updateOverlay}
              onDelete={deleteOverlay}
            />
          ))}
        </View>
      </View>

      {/* Bottom UI — hidden while a full-screen editor is up */}
      {!editing && sheet === "none" && (
        <View style={styles.bottom}>
          <View style={styles.toolRow}>
            <PlushButton
              label="Text"
              variant="soft"
              height={44}
              onPress={addText}
              icon={<Ionicons name="text" size={16} color={colors.primary} />}
            />
            <PlushButton
              label="Stickers"
              variant="soft"
              height={44}
              onPress={() => {
                setSelectedId(null);
                setSheet("stickers");
              }}
              icon={
                <Ionicons name="sparkles" size={16} color={colors.primary} />
              }
            />
          </View>

          <View style={styles.addRow}>
            <PlushButton
              label="add it!"
              height={56}
              disabled={saving}
              onPress={handleAddToHug}
              style={{ minWidth: 180 }}
            />
          </View>

          <View style={styles.filterRow}>
            {filterKeys.map((key) => {
              const isSelected = key === selected;
              const tuned = tuning[key].hue !== 0 || tuning[key].light !== 0;
              return (
                <Pressable
                  key={key}
                  onPress={() => selectFilter(key)}
                  onLongPress={() => openTune(key)}
                  delayLongPress={220}
                  style={[
                    styles.filterBox,
                    isSelected && styles.filterBoxSelected,
                  ]}
                >
                  <FilterPreview image={image} matrix={FILTERS[key].matrix} />
                  <View style={styles.filterLabelRow}>
                    <Text
                      style={[
                        styles.filterText,
                        isSelected && styles.filterTextSelected,
                      ]}
                    >
                      {FILTERS[key].name}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="options-outline"
                        size={13}
                        color={tuned ? colors.primary : colors.softInk}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* <Text style={styles.hint}>
            press &amp; hold a filter, then drag to tune hue &amp; light
          </Text> */}
        </View>
      )}

      {/* Fine-tune sheet */}
      {!editing && sheet === "tune" && (
        <View style={styles.sheetWrap}>
          <FineTunePad
            filterName={selectedFilterName}
            hue={hue}
            light={light}
            onDone={tuneDone}
            onReset={tuneReset}
          />
        </View>
      )}

      {/* Sticker sheet */}
      {!editing && sheet === "stickers" && (
        <View style={styles.sheetWrap}>
          <StickerSheet onPick={addSticker} onClose={() => setSheet("none")} />
        </View>
      )}

      {/* Text editor (full screen) */}
      {editing && (
        <TextEditorOverlay
          draft={editing}
          onCancel={() => setEditing(null)}
          onDone={editorDone}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    zIndex: 5,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: font.displayBold,
    fontSize: 18,
    color: colors.plumInk,
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  bottom: {
    paddingBottom: 40,
    paddingTop: 12,
    gap: 16,
    alignItems: "center",
  },
  toolRow: { flexDirection: "row", gap: 12 },
  addRow: { alignItems: "center" },
  filterRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  filterBox: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    gap: 4,
  },
  filterBoxSelected: {
    backgroundColor: "white",
  },
  filterLabelRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  filterText: {
    color: colors.plumInk,
    fontFamily: font.uiBold,
    fontSize: 13,
  },
  filterTextSelected: { color: colors.plumInk },
  hint: {
    color: "rgba(74,66,104,0.7)",
    fontFamily: font.ui,
    fontSize: 12,
    textAlign: "center",
  },
  sheetWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
