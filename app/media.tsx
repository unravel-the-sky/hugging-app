import { useImage } from "@shopify/react-native-skia";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, Image } from "react-native";

import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";

import FilterPreview from "@/components/postcard/FilterPreview";
import PostImage from "@/components/postcard/PostImage";
import DraggableText from "@/components/ui/DraggableText";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { FilterKey, filterKeys, FILTERS } from "@/constants/postcardConstants";
import { useImageColors } from "@/hooks/useImageColors";
import usePolaroidFrameCalc from "@/hooks/usePolaroidFrameCalc";
import { auth, storage } from "@/lib/firebaseConfig";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { TextInput } from "react-native-gesture-handler";

import { useHugDraft } from "@/hooks/useHugDraft";

import * as ImageManipulator from "expo-image-manipulator";

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

  const [selected, setSelected] = useState<FilterKey>("normal");
  const [saving, setSaving] = useState(false);
  const [cloudStorageUrl, setCloudStorageUrl] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const [textArray, setTextArray] = useState<string[]>([]);
  const [activeText, setActiveText] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const setPhoto = useHugDraft((s) => s.setPhotoUri);

  // keep this, thinking of adding an option to 'save image' before sending it instead of saving all the time
  const handleSaveIamge = async (captureUri: string) => {
    try {
      setSaving(true);
      // permissions bit
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("permission needed", "allow photo lib access pls");
        return;
      }
      await MediaLibrary.saveToLibraryAsync(captureUri);
    } catch (err) {
      console.error("Error happened while saving: ", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndAddImageToHug = async () => {
    try {
      setSaving(true);

      // permissions bit
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("permission needed", "allow photo lib access pls");
        return;
      }

      const captureUri = await captureRef(imageRef, {
        format: "jpg",
        quality: 0.4,
        result: "tmpfile",
      });

      if (!captureUri) throw new Error("Capture failed!");

      const { width: capW, height: capH } = await getPixelSize(captureUri);
      const scaleX = capW / canvasWidth;
      const scaleY = capH / canvasHeight;

      const originX = Math.round(canvasPadding * scaleX);
      const originY = Math.round(canvasPadding * scaleY);
      const cropW = Math.min(Math.round(frameWidth * scaleX), capW - originX);
      const cropH = Math.min(Math.round(frameHeight * scaleY), capH - originY);

      const context = ImageManipulator.ImageManipulator.manipulate(
        captureUri,
      ).crop({
        originX,
        originY,
        width: cropW,
        height: cropH,
      });

      // const captureFile = new File(captureUri);
      // const base64 = await captureFile.base64();

      // // saving
      // const filename = `polaroid-hug-${Date.now()}.png`;
      // const file = new File(Paths.cache, filename);
      // file.create();
      // file.write(base64, { encoding: "base64" });

      const rendered = await context.renderAsync();
      const cropped = await rendered.saveAsync({
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const response = await fetch(cropped.uri);
      const blob = await response.blob();

      // create reference
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("not signed in");

      const imgName = `polaroid-hug-${Date.now()}`;
      const storageRef = ref(storage, `images/${uid}/${imgName}`);

      console.log("upload size (KB):", Math.round(blob.size / 1024));

      const t0 = Date.now();
      const storageSnapshot = await uploadBytes(storageRef, blob, {
        contentType: "image/webp",
      });
      const t1 = Date.now();
      console.log("uploadBytes took (ms):", t1 - t0);

      const downloadUrl = await getDownloadURL(storageSnapshot.ref);
      const t2 = Date.now();
      console.log("getDownloadURL took (ms):", t2 - t1);

      handleSaveIamge(cropped.uri);

      // save and exit
      setCloudStorageUrl(downloadUrl);
      handleSendNoteWithPicture(downloadUrl);
    } catch (err) {
      console.error("Error happened while saving: ", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendNoteWithPicture = (imagePath: string) => {
    setPhoto(imagePath);
    router.back();
  };

  useEffect(() => {
    setActiveIndex(0);
  }, []);

  const handleAddNewText = () => {
    console.log("adding new text!");
    setModalVisible(true);
    setActiveText("");
    setActiveIndex(undefined);
  };
  const editText = (index: number) => {
    console.log("editing text with index: ", index);
    setActiveIndex(index);
    setActiveText(textArray[index]);
    setModalVisible(true);
  };
  const saveActiveText = () => {
    if (activeText === "") {
      setModalVisible(false);
      return;
    }

    if (activeIndex !== undefined) {
      const temp = textArray.map((text, index) => {
        if (index === activeIndex) {
          return activeText;
        } else {
          return text;
        }
      });
      setTextArray(temp);
    } else {
      setTextArray([...textArray, activeText]);
    }
    setModalVisible(false);
  };

  const { canvasWidth, canvasHeight, canvasPadding, frameWidth, frameHeight } =
    usePolaroidFrameCalc();

  const [imgColor, setImgColor] = useState<string | undefined>(undefined);

  const { colors: imageColors } = useImageColors(media);

  useEffect(() => {
    setImgColor(imageColors?.colorOne.value);
  }, [imageColors?.colorOne.value]);

  if (!image) return null;

  return (
    <View
      style={[styles.container, { backgroundColor: imgColor || "#D7C2B2" }]}
    >
      <View style={{ position: "fixed", top: 60, left: 18 }}>
        <Pressable onPress={onBack}>
          <Ionicons name="arrow-back" size={40} color={"#7c7c7c"} />
        </Pressable>
      </View>
      <View
        style={{
          flex: 1,
          top: 80,
          alignItems: "center",
        }}
      >
        <Pressable onPress={handleAddNewText}>
          <View
            ref={imageRef}
            collapsable={false}
            style={{
              width: canvasWidth,
              height: canvasHeight,
            }}
          >
            <PostImage media={media} selected={selected} />

            {textArray.length > 0 &&
              textArray.map((text, index) => (
                <View
                  key={index}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 20,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <DraggableText
                    item={text}
                    onPressed={() => editText(index)}
                  />
                </View>
              ))}
          </View>
        </Pressable>
      </View>

      {modalVisible && (
        <Pressable
          onPress={saveActiveText}
          style={{
            ...StyleSheet.absoluteFill,
            backgroundColor: "rgba(0,0,0,0.8)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              width: "100%",
              position: "relative",
            }}
          >
            <View
              style={{
                position: "absolute",
                left: 20,
                bottom: 0,
                backgroundColor: "green",
              }}
            ></View>
            <TextInput
              autoFocus
              multiline
              value={activeText}
              onChangeText={setActiveText}
              maxLength={60}
              style={{
                color: "white",
                fontSize: 30,
                textAlign: "center",
                minWidth: 100,
                fontFamily: "CuteFont",
              }}
            />
          </View>
        </Pressable>
      )}

      <View style={styles.filterRow}>
        {filterKeys.map((key) => {
          const isSelected = key === selected;
          return (
            <Pressable
              key={key}
              onPress={() => setSelected(key)}
              style={[styles.filterBox, isSelected && styles.filterBoxSelected]}
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

      <View style={styles.buttonContainer}>
        <PlushButton
          label="add it!"
          disabled={saving}
          onPress={handleSaveAndAddImageToHug}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 150,
    flex: 1,
    gap: 12,
    alignSelf: "center",
    flexDirection: "row",
  },
  saveButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "white",
    width: 120,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "600",
  },
  filterRow: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  filterBox: {
    display: "flex",
    gap: 6,
    padding: 8,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    borderColor: "rgba(255,255,255,0.2)",
    minWidth: 60,
    alignItems: "center",
  },
  filterBoxSelected: {
    backgroundColor: "white",
    borderColor: "white",
  },
  filterText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  filterTextSelected: {
    color: "#1a1a1a",
    fontWeight: "600",
  },
});
