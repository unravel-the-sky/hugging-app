import {
  CameraMode,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { colors, font, IconButton } from "@/components/ui/squish";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { APP_NAME } from "@/constants";
import { useImageColors } from "@/hooks/useImageColors";
import { Ionicons } from "@expo/vector-icons";
import { useImage } from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
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

/** Viewport height as a multiple of screen width — a 3:4 sensor frame. */
const VIEWPORT_ASPECT = 4 / 3;
/**
 * Floor for the control bar. On a short screen the viewport gives up height
 * before the shutter does; a camera you can't press is worse than a cropped
 * preview.
 */
const MIN_CONTROLS_HEIGHT = 150;

/**
 * How long the white sits empty before the logo joins it. A capture that
 * finishes quickly should be a flash and nothing more — a mark that appears
 * and vanishes inside 200ms is a flicker, not a loading state.
 */
const LOGO_DELAY = 260 * 1.2;
const LOGO_SIZE = 104 * 1.2;

const LOGO = require("@/assets/images/splash-icon-mine-trans.png");

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

  // The logo waiting inside the flash. Its own opacity, so it can arrive late
  // and only when there is actually a wait to fill.
  const logoOpacity = useSharedValue(1);
  const logoScale = useSharedValue(1);
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const startWaiting = useCallback(() => {
    logoOpacity.value = withDelay(LOGO_DELAY, withTiming(1, { duration: 10 }));
    // lub-dub, then rest. Two uneven beats read as a pulse; one even one
    // reads as breathing.
    logoScale.value = withDelay(
      LOGO_DELAY,

      withRepeat(
        withSequence(
          withTiming(1.0, { duration: 260, easing: Easing.in(Easing.quad) }),
          withTiming(1.0, { duration: 320 }),
          withTiming(1.16, {
            duration: 150,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(1.02, { duration: 150, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [logoOpacity, logoScale]);

  const stopWaiting = useCallback(() => {
    cancelAnimation(logoScale);
    cancelAnimation(logoOpacity);
    logoScale.value = withTiming(1, { duration: 120 });
    logoOpacity.value = withTiming(0, { duration: 120 });
  }, [logoOpacity, logoScale]);

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
      stopWaiting();
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
  }, [phase, uri, assetsReady, flash, stopWaiting]);

  const abortCapture = useCallback(() => {
    setPhase("idle");
    stopWaiting();
    flash.value = withTiming(0, { duration: 180 });
  }, [flash, stopWaiting]);

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
    startWaiting();

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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

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
        flash.value = withTiming(1, {
          duration: 60,
          easing: Easing.inOut(Easing.quad),
        });
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
    // Camera permission is not granted. Once someone has denied it, iOS makes
    // requestPermission a silent no-op forever — the only way back is Settings,
    // so the button has to change with it rather than doing nothing on tap.
    return (
      <View style={styles.container}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.message}>
          {permission.canAskAgain
            ? `${APP_NAME} uses the camera to take the photo you send with your hug. The picture stays on your device until you choose to send it.`
            : `Camera access is turned off for ${APP_NAME}. Open Settings and turn on Camera to take a photo for your hug.`}
        </Text>
        <PlushButton
          label={permission.canAskAgain ? "Allow camera" : "Open Settings"}
          onPress={
            permission.canAskAgain ? requestPermission : Linking.openSettings
          }
        />
      </View>
    );
  }

  const retake = () => {
    setUri(null);
    setPhase("idle");
    cancelAnimation(logoScale);
    cancelAnimation(logoOpacity);
    logoScale.value = 1;
    logoOpacity.value = 0;
    flash.value = 0;
  };

  const renderPicture = (pictureUri: string) => {
    return (
      <View style={styles.cameraContainer}>
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
      </View>
    );
  };

  const renderCamera = () => {
    // A full-bleed 3:4 viewport. The old layout inset the preview by 24pt and
    // let flex divide the leftovers, which framed the camera like a card on a
    // page; a camera should own the screen and hold a real sensor ratio.
    const viewportHeight = Math.min(
      screenWidth * VIEWPORT_ASPECT,
      screenHeight - MIN_CONTROLS_HEIGHT - insets.top - insets.bottom,
    );

    return (
      <GestureDetector gesture={doubleTap}>
        <View style={styles.cameraScreen}>
          <View
            style={[styles.cameraHeader, { paddingTop: insets.top + 8 }]}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={() => router.back()}
              style={styles.headerBtn}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          </View>

          <View style={{ width: screenWidth, height: viewportHeight }}>
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
              <View style={styles.guideWrap} pointerEvents="none">
                <View style={styles.circleGuide} accessibilityElementsHidden />
              </View>
            )}
          </View>

          <View
            style={[
              styles.controls,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <IconButton
              variant="surface"
              size={50}
              accessibilityLabel="pick from device"
              icon={<Ionicons name="image-outline" size={30} />}
              onPress={pickImageFromMobileAsync}
            />

            <Pressable onPress={takePic} disabled={phase !== "idle"}>
              {({ pressed }) => (
                <View
                  style={[styles.shutterBtn, { opacity: pressed ? 0.5 : 1 }]}
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
      >
        <Animated.View style={logoStyle}>
          <Image
            source={LOGO}
            style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
            contentFit="contain"
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Black, not white: it is the surround for the camera viewport, and it is
    // also what a preview that hasn't painted yet shows through.
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    alignItems: "center",
  },
  cameraHeader: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  controls: {
    flex: 1,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 36,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraContainer: StyleSheet.absoluteFill,
  camera: StyleSheet.absoluteFill,
  // Centred in the viewport with a margin of its own, rather than stretched
  // to it — full-bleed the circle would run edge to edge and read as a crop
  // marker instead of a face guide.
  guideWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  circleGuide: {
    width: "100%",
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
  permissionTitle: {
    fontFamily: font.displayBold,
    fontSize: 22,
    textAlign: "center",
    paddingBottom: 8,
    // The container behind this is black now.
    color: "#fff",
  },
  message: {
    fontFamily: font.ui,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 32,
    paddingBottom: 20,
    // The container behind this is black now.
    color: "rgba(255,255,255,0.75)",
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
