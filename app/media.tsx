import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";

import FilterPreview from "@/components/postcard/FilterPreview";
import PostImage from "@/components/postcard/PostImage";
import DraggableOverlay from "@/components/postcard/DraggableOverlay";
import TextEditorOverlay, {
  TextDraft,
} from "@/components/postcard/TexteditorOverlay";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import Toast from "@/components/ui/squish/Toast";
import { colors, font } from "@/components/ui/squish/theme";

import { FilterKey, filterKeys, FILTERS } from "@/constants/postcardConstants";
import { newOverlayId, Overlay } from "@/constants/postcardEditorConstants";

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

  // ---- filters ---------------------------------------------------------
  const [selected, setSelected] = useState<FilterKey>("normal");

  // ---- overlays --------------------------------------------------------
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TextDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  // ---- text ------------------------------------------------------------
  const addText = () => {
    setSelectedId(null);
    setEditing({
      text: "",
      fontKey: "fredoka",
      size: 40,
      color: colors.softInk,
    });
  };

  const editorDone = (draft: TextDraft) => {
    if (draft.id) {
      setOverlays((list) =>
        list.map((o) =>
          o.id === draft.id
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

  const onOverlayTap = (o: Overlay) => {
    setSelectedId(o.id);
    setEditing({
      id: o.id,
      text: o.text,
      fontKey: o.fontKey,
      size: o.size,
      color: o.color,
    });
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
    setEditing((cur) => (cur?.id === id ? null : cur));
  };

  // ---- capture ---------------------------------------------------------
  const captureCropped = async () => {
    // Drop selection chrome so the dashed box / × aren't baked in.
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
      setToast({ visible: true, message: "Saved to your photos" });
    } catch (err) {
      console.error("Error saving image:", err);
      setToast({ visible: true, message: "Couldn't save — try again" });
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
      const imgPath = `images/${uid}/${imgName}`;
      const storageRef = ref(storage, imgPath);

      await uploadBytes(storageRef, blob, {
        contentType: "image/jpeg",
      });
      // const downloadUrl = await getDownloadURL(snapshot.ref);

      setPhoto(imgPath);
      router.back();
    } catch (err) {
      console.error("Error adding image to hug:", err);
      setToast({ visible: true, message: "Couldn't add — try again" });
    } finally {
      setSaving(false);
    }
  };

  // ---- colours ---------------------------------------------------------
  const { colors: imageColors } = useImageColors(media);
  const bg = imageColors?.colorOne?.value ?? "#D7C2B2";

  if (!image) return null;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.plumInk} />
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { color: imageColors?.colorFour.value || colors.blush },
          ]}
        >
          Edit
        </Text>
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
          style={{
            width: canvasWidth,
            height: canvasHeight,
            overflow: "hidden",
          }}
        >
          <PostImage media={media} selected={selected} />

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

      {/* Bottom UI — hidden while the editor is up */}
      {!editing && (
        <View style={styles.bottom}>
          <View style={styles.toolRow}>
            <PlushButton
              label="Text"
              variant="soft"
              height={44}
              onPress={addText}
              icon={<Ionicons name="text" size={16} color={colors.primary} />}
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
              return (
                <Pressable
                  key={key}
                  onPress={() => setSelected(key)}
                  style={[
                    styles.filterBox,
                    isSelected && styles.filterBoxSelected,
                  ]}
                >
                  <FilterPreview image={image} matrix={FILTERS[key].matrix} />
                  <Text
                    style={[
                      styles.filterText,
                      isSelected && styles.filterTextSelected,
                    ]}
                  >
                    {FILTERS[key].name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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

      {/* Save toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: "absolute",
    top: 26,
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
    fontFamily: font.display,
    fontSize: 18,
    color: colors.plumInk,
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 75,
  },
  bottom: {
    paddingBottom: 20,
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
  filterText: {
    color: colors.plumInk,
    fontFamily: font.uiBold,
    fontSize: 13,
  },
  filterTextSelected: { color: colors.plumInk },
});
