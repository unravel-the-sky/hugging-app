import {
  CameraMode,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import React, { useCallback, useRef, useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { colors, IconButton, spacing } from "@/components/ui/squish";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Media from "./media";
import { router } from "expo-router";

export interface TakePictureProps {
  renderPreview?: (uri: string, onRetake: () => void) => React.ReactNode;
  defaultFacing?: CameraType;
  circularGuide?: boolean;
}

export default function TakePicture({
  renderPreview,
  defaultFacing = "back",
  circularGuide = false,
}: TakePictureProps) {
  const [facing, setFacing] = useState<CameraType>(defaultFacing);
  const [permission, requestPermission] = useCameraPermissions();

  const ref = useRef<CameraView>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [mode, setMode] = useState<CameraMode>("picture");

  const toggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }, []);

  const takePic = async () => {
    const photo = await ref.current?.takePictureAsync();
    if (photo?.uri) setUri(photo.uri);
  };

  const insets = useSafeAreaInsets();

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      scheduleOnRN(toggleCameraFacing);
    });

  const pickImageFromMobileAsync = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!res.canceled && res.assets[0].uri) setUri(res.assets[0].uri);
    } catch (err) {
      console.error(
        "Erro happened while getting pictures from library, error ",
        err,
      );
    }
  };

  if (!permission) {
    // camera permissions are loading
    return <View />;
  }

  if (!permission.granted) {
    // camera permissions are not granted
    return (
      <View style={styles.container}>
        <Text style={styles.message}>You need to give permissions bro..</Text>
        <Button onPress={requestPermission} title={"gimme permission"} />
      </View>
    );
  }

  const renderPicture = (pictureUri: string) => {
    return (
      <SafeAreaView style={styles.cameraContainer} edges={["top"]}>
        {renderPreview ? (
          renderPreview(pictureUri, () => setUri(null))
        ) : (
          <Media media={pictureUri} onBack={() => setUri(null)} />
        )}
      </SafeAreaView>
    );
  };

  const renderCamera = () => {
    return (
      <GestureDetector gesture={doubleTap}>
        <SafeAreaView
          style={{
            ...StyleSheet.absoluteFill,
            paddingHorizontal: 24,
            // paddingVertical: 26,
            marginTop: 40,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.header} pointerEvents="box-none">
              <Pressable
                onPress={() => router.back()}
                style={styles.headerBtn}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={24} color={colors.plumInk} />
              </Pressable>
            </View>
            <View
              style={{
                flex: 3,
                overflow: "hidden",
                borderRadius: 12,
              }}
            >
              <CameraView
                style={styles.camera}
                ref={ref}
                mode={mode}
                facing={facing}
                mute={false}
                mirror={true}
                responsiveOrientationWhenOrientationLocked
              />
              {circularGuide && (
                <View
                  style={styles.circleGuide}
                  pointerEvents="none"
                  accessibilityElementsHidden
                />
              )}
            </View>
            <View
              style={{
                flex: 2,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  margin: 40,
                }}
              >
                <IconButton
                  variant="surface"
                  size={50}
                  accessibilityLabel="pick from device"
                  icon={<Ionicons name="image-outline" size={30} />}
                  onPress={pickImageFromMobileAsync}
                />

                <Pressable onPress={takePic}>
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.shutterBtn,
                        {
                          opacity: pressed ? 0.5 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.shutterBtnInner,
                          {
                            backgroundColor:
                              mode === "picture" ? colors.deep : "red",
                          },
                        ]}
                      />
                    </View>
                  )}
                </Pressable>
                <IconButton
                  variant="surface"
                  size={50}
                  accessibilityLabel="toggle camera"
                  icon={<Ionicons name="camera-reverse-outline" size={30} />}
                  onPress={toggleCameraFacing}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </GestureDetector>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, spacing.lg) },
      ]}
    >
      {uri ? renderPicture(uri) : renderCamera()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flex: 0.5,
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
  cameraContainer: StyleSheet.absoluteFill,
  camera: StyleSheet.absoluteFill,
  circleGuide: {
    ...StyleSheet.absoluteFill,
    margin: "auto",
    aspectRatio: 1,
    borderRadius: 9999,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
  },
  shutterContainer: {
    position: "absolute",
    bottom: 44,
    left: 0,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
  },
  shutterBtn: {
    backgroundColor: "transparent",
    borderWidth: 8,
    borderColor: "white",
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBtnInner: {
    width: 70,
    height: 70,
    borderRadius: 50,
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 64,
    flexDirection: "row",
    backgroundColor: "transparent",
    width: "100%",
    paddingHorizontal: 64,
  },
  button: {
    flex: 1,
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
});
