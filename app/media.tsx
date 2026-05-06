import {
  Canvas,
  ColorMatrix,
  Group,
  Image,
  ImageFormat,
  RoundedRect,
  Text as SkiaText,
  useCanvasRef,
  useFont,
  useImage,
} from "@shopify/react-native-skia";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebaseConfig";

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

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const textFont = useFont(
    require("@/assets/fonts/JustMeAgainDownHere-Regular.ttf"),
    32,
  );

  const image = useImage(media);
  const [selected, setSelected] = useState<FilterKey>("normal");

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
  const frameY = (screenHeight - frameHeight) / 2 - 20;
  const photoX = frameX + frameHorizontalPadding;
  const photoY = frameY + frameTopPadding;

  // Center of the polaroid — used as rotation/scale pivot
  const centerX = frameX + frameWidth / 2;
  const centerY = frameY + frameHeight / 2;

  const textX = textFont
    ? frameWidth / 2 -
      textFont.measureText(note).width / 2 +
      frameHorizontalPadding
    : 80;
  const textY = 580;

  const animatedMatrix = useDerivedValue(() => {
    const target = FILTERS[selected].matrix;
    return lerpMatrix(WHITE, target, developProgress.value);
  }, [selected]);

  // Polaroid transform — scale 1.05 -> 1, rotate 10deg -> 0
  const scaleVal = 1.55;
  const rotateVal = -10;
  const translateYVal = -10;
  const polaroidTransform = useDerivedValue(() => {
    const t = dropProgress.value;
    const scale = scaleVal + (1 - scaleVal) * t; // scaleVal -> 1
    const rotate = ((rotateVal * Math.PI) / 180) * (1 - t); // 10deg -> 0
    const translateY = translateYVal + (0 - translateYVal) * t;
    return [{ scale }, { rotate }, { translateY }];
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
  const shadowX = useDerivedValue(() => frameX + shadowOffsetX.value);
  const shadowY = useDerivedValue(() => frameY + shadowOffsetY.value);

  const canvasRef = useCanvasRef();
  const [saving, setSaving] = useState(false);

  const [cloudStorageUrl, setCloudStorageUrl] = useState("");

  const handleSaveImage = async () => {
    try {
      setSaving(true);

      // permissions bit
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("permission needed", "allow photo lib access pls");
        return;
      }

      // take snapshot of the canvas
      const snapshot = canvasRef.current?.makeImageSnapshot({
        x: frameX - 8,
        y: frameY - 8,
        height: frameHeight + 16,
        width: frameWidth + 16,
      });

      if (!snapshot) {
        Alert.alert("save failed", "could not save image");
        return;
      }

      // encoding
      const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, 80);

      // saving
      const filename = `polaroid-hug-${Date.now()}.png`;
      const file = new File(Paths.cache, filename);
      file.create();
      file.write(base64, { encoding: "base64" });

      await MediaLibrary.saveToLibraryAsync(file.uri);

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

  if (!image) return null;

  return (
    <View style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill} ref={canvasRef}>
        <Group
          origin={{ x: centerX, y: centerY }}
          transform={polaroidTransform}
          opacity={polaroidOpacity}
        >
          {/* Shadow */}
          <RoundedRect
            x={shadowX}
            y={shadowY}
            width={frameWidth}
            height={frameHeight}
            r={4}
            color={shadowOpacity}
          />
          {/* White card */}
          <RoundedRect
            x={frameX}
            y={frameY}
            width={frameWidth}
            height={frameHeight}
            r={4}
            color="white"
          />
          {/* Photo */}
          <Image
            x={photoX}
            y={photoY}
            width={photoWidth}
            height={photoHeight}
            image={image}
            fit="cover"
          >
            <ColorMatrix matrix={animatedMatrix} />
          </Image>
          {/* Caption */}
          <SkiaText text={note} font={textFont} x={textX} y={textY} />
        </Group>
      </Canvas>

      <View style={styles.filterRow}>
        {(Object.keys(FILTERS) as FilterKey[]).map((key) => {
          const isSelected = key === selected;
          return (
            <Pressable
              key={key}
              onPress={() => setSelected(key)}
              style={[styles.filterBox, isSelected && styles.filterBoxSelected]}
            >
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
          <Text style={styles.saveButtonText}>take another pic</Text>
        </Pressable>
        <Pressable
          onPress={handleSaveImage}
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "adding.." : "add pic to hug"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#bbbbbb",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 140,
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
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  filterBox: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.2)",
    minWidth: 80,
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
