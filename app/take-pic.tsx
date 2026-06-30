import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import {
  CameraMode,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import * as ImagePicker from "expo-image-picker";
import Media from "./media";

export default function TakePicture() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();

  const ref = useRef<CameraView>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [mode, setMode] = useState<CameraMode>("picture");

  const { toUid, toName, note } = useLocalSearchParams<{
    toUid: string;
    toName: string;
    note: string;
  }>();

  const toggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }, []);

  const takePic = async () => {
    const photo = await ref.current?.takePictureAsync();
    if (photo?.uri) setUri(photo.uri);
  };

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      console.log("double tapped!");
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

  const renderPicture = (uri: string) => {
    return (
      <SafeAreaView style={styles.cameraContainer} edges={["top"]}>
        <Media media={uri} onBack={() => setUri(null)} />
      </SafeAreaView>
    );
  };

  const renderCamera = () => {
    return (
      <GestureDetector gesture={doubleTap}>
        <SafeAreaView
          style={{
            ...StyleSheet.absoluteFill,
            paddingHorizontal: 22,
            paddingVertical: 26,
            marginTop: 80,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View style={{ flex: 1 }}>
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
                <Pressable onPress={pickImageFromMobileAsync}>
                  <AntDesign name="picture" size={32} color="grey" />
                </Pressable>
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
                              mode === "picture" ? "grey" : "red",
                          },
                        ]}
                      />
                    </View>
                  )}
                </Pressable>
                <Pressable onPress={toggleCameraFacing}>
                  <FontAwesome6 name="rotate-left" size={32} color="grey" />
                </Pressable>
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
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraContainer: StyleSheet.absoluteFill,
  camera: StyleSheet.absoluteFill,
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
    borderWidth: 5,
    borderColor: "white",
    width: 85,
    height: 85,
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
