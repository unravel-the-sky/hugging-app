import {
  CameraMode,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { colors, IconButton } from "@/components/ui/squish";
import { useImageColors } from "@/hooks/useImageColors";
import { Ionicons } from "@expo/vector-icons";
import { useImage } from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Media from "./media";
import { router } from "expo-router";

/** White-out, in ms. Short enough to read as a shutter, not a fade. */
const FLASH_IN = 80;
/** How long the white sits at full before we start revealing. */
const FLASH_HOLD = 60;
/** The reveal. The next screen is already warm underneath by now. */
const FLASH_OUT = 240;
/**
 * Ceiling on how long the flash will wait for the photo to decode and its
 * colours to come back. A slow device must still get its picture — better a
 * preview that settles in front of you than one stuck behind a white screen.
 */
const READY_TIMEOUT = 2500;

type Phase = "idle" | "capturing" | "preview";

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
  const [phase, setPhase] = useState<Phase>("idle");

  // Only the postcard editor needs a decoded photo and a palette. A custom
  // preview (the avatar flow) renders a plain <Image>, so doing either would
  // be pure delay.
  const needsPostcard = !renderPreview;

  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  // The two slow steps, moved off the preview's mount and behind the flash.
  const preloaded = useImage(needsPostcard ? uri : null);
  const { colors: palette, ready: paletteReady } = useImageColors(
    needsPostcard ? uri : null,
  );

  const assetsReady = needsPostcard ? !!preloaded && paletteReady : true;

  // Reveal once the next screen can paint itself in one go — or once we have
  // waited long enough that holding the white costs more than it hides.
  useEffect(() => {
    if (phase !== "capturing" || !uri) return;

    const reveal = () => {
      setPhase("preview");
      flash.value = withDelay(
        FLASH_HOLD,
        withTiming(0, { duration: FLASH_OUT, easing: Easing.out(Easing.quad) }),
      );
    };

    if (assetsReady) {
      reveal();
      return;
    }

    const timer = setTimeout(reveal, READY_TIMEOUT);
    return () => clearTimeout(timer);
  }, [phase, uri, assetsReady, flash]);

  const abortCapture = useCallback(() => {
    setPhase("idle");
    flash.value = withTiming(0, { duration: 180 });
  }, [flash]);

  const toggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }, []);

  const takePic = async () => {
    if (phase !== "idle") return;

    // Everything here is synchronous and happens before the await: the whole
    // point is that the tap has already produced light and a thump by the time
    // the native capture starts blocking.
    setPhase("capturing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    flash.value = withTiming(1, {
      duration: FLASH_IN,
      easing: Easing.out(Easing.quad),
    });

    try {
      // Unqualified, this hands back a full-resolution frame that then gets
      // decoded again by Skia, by the colour extractor and by every filter
      // swatch. Asking for less here is the single biggest win on this path.
      const photo = await ref.current?.takePictureAsync({
        quality: 0.7,
        exif: false,
        shutterSound: false,
      });
      if (photo?.uri) {
        setUri(photo.uri);
        return;
      }
      abortCapture();
    } catch (err) {
      console.error("Taking the picture failed, error ", err);
      abortCapture();
    }
  };

  const insets = useSafeAreaInsets();

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      scheduleOnRN(toggleCameraFacing);
    });

  const pickImageFromMobileAsync = async () => {
    if (phase !== "idle") return;

    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!res.canceled && res.assets[0].uri) {
        // No shutter here — nothing was captured — but the picked photo needs
        // the same warm-up, so it goes behind the same curtain. Straight to
        // opaque rather than a pop.
        setPhase("capturing");
        flash.value = withTiming(1, { duration: 120 });
        setUri(res.assets[0].uri);
      }
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

  const retake = () => {
    setUri(null);
    setPhase("idle");
    flash.value = 0;
  };

  const renderPicture = (pictureUri: string) => {
    return (
      <SafeAreaView style={styles.cameraContainer} edges={["top"]}>
        {renderPreview ? (
          renderPreview(pictureUri, retake)
        ) : (
          <Media
            media={pictureUri}
            onBack={retake}
            image={preloaded}
            palette={palette}
          />
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
    <View style={styles.container}>
      {uri ? renderPicture(uri) : renderCamera()}

      {/* The shutter flash, and the curtain the next screen loads behind.
          It stays opaque while the photo decodes, so what fades away reveals
          a preview that is already finished rather than one still arriving. */}
      <Animated.View
        style={[styles.flash, flashStyle]}
        pointerEvents={phase === "capturing" ? "auto" : "none"}
      />
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
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
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
