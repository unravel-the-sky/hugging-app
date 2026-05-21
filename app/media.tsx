import {
  Canvas,
  ColorMatrix,
  Group,
  Image,
  Rect,
  SkImage,
  useCanvasRef,
  useImage,
} from "@shopify/react-native-skia";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";

import DraggableText from "@/components/ui/DraggableText";
import { storage } from "@/lib/firebaseConfig";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { TextInput } from "react-native-gesture-handler";

// Identity matrix — for what the image looks like as is
const IDENTITY: number[] = [
  1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0,
];

// "Pure white" matrix — every pixel forced to white
const WHITE: number[] = [
  0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0,
];

// Color matrix presets
const FILTERS = {
  normal: {
    name: "Normal",
    matrix: IDENTITY,
  },
  vivid: {
    name: "Vivid",
    matrix: [
      1.0, 0.2, 0.0, 0.0, 0.088, 0.0, 1.0, 0.0, 0.0, 0.088, 0.1, 0.4, 1.2, -0.4,
      0.388, 0.0, 0.0, 0.0, 1.0, 0.0,
    ],
  },
  sepia: {
    name: "Sepia",
    matrix: [
      0.393, 0.769, 0.189, 0, 0, 0.349, 0.686, 0.168, 0, 0, 0.272, 0.534, 0.131,
      0, 0, 0, 0, 0, 1, 0,
    ],
  },
  bw: {
    name: "B&W",
    matrix: [
      0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114,
      0, 0, 0, 0, 0, 1, 0,
    ],
  },
} as const;

type FilterKey = keyof typeof FILTERS;

const filterKeys = Object.keys(FILTERS) as FilterKey[];

// Linearly interpolate between two matrices, whoa took from claude
const lerpMatrix = (a: readonly number[], b: readonly number[], t: number) => {
  "worklet";
  return a.map((v, i) => v + (b[i] - v) * t);
};

export default function Media() {
  const { toUid, toName, media, note } = useLocalSearchParams<{
    toUid: string;
    toName: string;
    media: string;
    note: string;
  }>();

  const image = useImage(media);

  const imageRef = useRef(null);

  const [selected, setSelected] = useState<FilterKey>("normal");

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // 0 = mid-drop (scaled up, tilted), 1 = landed
  const dropProgress = useSharedValue(0);
  // 0 = pure white, 1 = fully developed
  const developProgress = useSharedValue(0);

  useEffect(() => {
    if (image) {
      dropProgress.value = withDelay(
        40,
        withTiming(1, {
          duration: 900,
          easing: Easing.out(Easing.back(1.5)),
        }),
      );
      // Start developing slightly before the drop fully settles
      developProgress.value = withDelay(
        300,
        withTiming(1, {
          duration: 2500,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
  }, [dropProgress, developProgress, image, selected]);

  // Polaroid layout
  const frameWidth = screenWidth * 0.88;
  const frameHorizontalPadding = 18;
  const frameTopPadding = 18;
  const frameBottomPadding = 80;
  const photoWidth = frameWidth - frameHorizontalPadding * 2;
  const photoHeight = photoWidth;
  const frameHeight = photoHeight + frameTopPadding + frameBottomPadding;

  const frameX = (screenWidth - frameWidth) / 2;
  const frameY = (screenHeight - frameHeight) / 2 - 60;

  const canvasPadding = 10; // for shadow
  const canvasWidth = frameWidth + canvasPadding * 2;
  const canvasHeight = frameHeight + canvasPadding * 2;

  const frameXLocal = canvasPadding;
  const frameYLocal = canvasPadding;
  const photoXLocal = frameXLocal + frameHorizontalPadding;
  const photoYLocal = frameYLocal + frameTopPadding;

  const centerXLocal = canvasWidth / 2;
  const centerYLocal = canvasHeight / 2;

  const scaleVal = 1.55;
  const rotateVal = -10;
  const translateYVal = -10;
  const polaroidTransform = useDerivedValue(() => {
    const t = dropProgress.value;
    const scale = scaleVal + (1 - scaleVal) * t; // scaleVal -> 1
    const rotate = ((rotateVal * Math.PI) / 180) * (1 - t); // 10deg -> 0
    return [];
  });

  const opacityVal = 0;
  const polaroidOpacity = useDerivedValue(() => {
    const t = dropProgress.value;
    const opacity = opacityVal + (1 - opacityVal) * t; // scaleVal -> 1
    return opacity;
  });

  // Shadow follows the drop: larger offset and softer when "in air"
  const shadowOffsetX = useDerivedValue(
    () => 2 + (1 - dropProgress.value) * 14,
  );
  const shadowOffsetY = useDerivedValue(
    () => 6 + (1 - dropProgress.value) * 22,
  );
  const shadowOpacity = useDerivedValue(
    () => `rgba(0,0,0,${0.25 + (1 - dropProgress.value) * 0.15})`,
  );

  // Shadow rect position needs to be a SharedValue too since it depends on dropProgress
  const shadowX = useDerivedValue(() => frameXLocal + shadowOffsetX.value);
  const shadowY = useDerivedValue(() => frameYLocal + shadowOffsetY.value);

  const canvasRef = useCanvasRef();
  const [saving, setSaving] = useState(false);

  const [cloudStorageUrl, setCloudStorageUrl] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const [draftText, setDraftText] = useState("");

  const handleSaveImage = async () => {
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
        quality: 0.6,
        result: "tmpfile",
      });

      if (!captureUri) {
        alert("Oupsie..");
      }
      await MediaLibrary.saveToLibraryAsync(captureUri);

      // encoding
      const captureFile = new File(captureUri);
      const base64 = await captureFile.base64();

      // // saving
      const filename = `polaroid-hug-${Date.now()}.png`;
      const file = new File(Paths.cache, filename);
      file.create();
      file.write(base64, { encoding: "base64" });

      // upload here to firebase

      // create blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      // create reference
      const imgName = `polaroid-hug-${Date.now()}`;
      const storageRef = ref(storage, `images/${imgName}`);

      // upload blob/bytes
      const storageSnapshot = await uploadBytes(storageRef, blob);

      // get url
      const downloadUrl = await getDownloadURL(storageSnapshot.ref);
      setCloudStorageUrl(downloadUrl);
      console.log("OMG did it work?? : ", downloadUrl);

      // send to main screen to send the hug
      handleSendNoteWithPicture(downloadUrl);
    } catch (err) {
      console.error("Error happened while saving: ", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendNoteWithPicture = (storagePath: string) => {
    router.replace({
      pathname: "/(tabs)",
      params: {
        toUid,
        toName,
        note: note.trim(),
        imagePath: storagePath,
      },
    });
  };

  const animatedMatrix = useDerivedValue(() => {
    const target = FILTERS[selected].matrix;
    return lerpMatrix(WHITE, target, developProgress.value);
  }, [selected]);

  if (!image) return null;

  return (
    <View style={styles.container}>
      <View
        style={{
          flex: 1,
          top: 120,
          alignItems: "center",
        }}
      >
        <View
          ref={imageRef}
          collapsable={false}
          style={{
            width: canvasWidth,
            height: canvasHeight,
          }}
        >
          <Canvas
            style={{ width: canvasWidth, height: canvasHeight }}
            ref={canvasRef}
          >
            <Group
              origin={{ x: centerXLocal, y: centerYLocal }}
              transform={polaroidTransform}
              opacity={polaroidOpacity}
            >
              {/* Shadow */}
              <Rect
                x={shadowX}
                y={shadowY}
                width={frameWidth}
                height={frameHeight}
                color={shadowOpacity}
              />
              {/* White card */}
              <Rect
                x={frameXLocal}
                y={frameYLocal}
                width={frameWidth}
                height={frameHeight}
                color="white"
              />
              {/* Photo */}
              <Image
                x={photoXLocal}
                y={photoYLocal}
                width={photoWidth}
                height={photoHeight}
                image={image}
                fit="cover"
              >
                <ColorMatrix matrix={animatedMatrix} />
              </Image>
            </Group>
          </Canvas>

          {draftText && (
            <DraggableText
              item={draftText}
              onPressed={() => {
                setModalVisible(true);
              }}
            />
          )}
        </View>
      </View>

      {modalVisible && (
        <Pressable
          onPress={() => {
            setModalVisible(!modalVisible);
          }}
          style={{
            ...StyleSheet.absoluteFill,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TextInput
            autoFocus
            multiline
            value={draftText}
            onChangeText={setDraftText}
            maxLength={60}
            style={{
              color: "white",
              fontSize: 30,
              textAlign: "center",
              minWidth: 100,
              fontFamily: "CuteFont",
            }}
          />
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
        <Pressable
          style={styles.saveButton}
          onPress={() => {
            router.back();
          }}
        >
          <Text style={styles.saveButtonText}>back</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setModalVisible(!modalVisible);
          }}
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>
            {draftText ? "edit" : "add"} text
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSaveImage}
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "adding.." : "send"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const FILTER_PREVIEW_SIZE = 48;

type FilterPreviewProps = {
  image: SkImage;
  matrix: readonly number[];
};

const FilterPreview = ({ image, matrix }: FilterPreviewProps) => {
  return (
    <Canvas style={{ width: FILTER_PREVIEW_SIZE, height: FILTER_PREVIEW_SIZE }}>
      <Image
        x={0}
        y={0}
        width={FILTER_PREVIEW_SIZE}
        height={FILTER_PREVIEW_SIZE}
        image={image}
        fit="cover"
      >
        <ColorMatrix matrix={[...matrix]} />
      </Image>
    </Canvas>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#bbbbbb",
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
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "white",
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
