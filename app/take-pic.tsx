import {
  CameraView,
  CameraType,
  useCameraPermissions,
  CameraMode,
} from "expo-camera";
import { Image } from "expo-image";
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React, { useCallback, useRef, useState } from "react";
import {
  Button,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

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
    if (photo?.uri) {
      router.replace({
        pathname: "/media",
        params: {
          toUid,
          toName,
          media: photo.uri,
          note,
        },
      });
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
        <Image
          source={{ uri }}
          contentFit="contain"
          style={{
            width: "100%",
            height: "80%",
            resizeMode: "contain",
          }}
        />
        <Button onPress={() => setUri(null)} title="Take another pic" />
      </SafeAreaView>
    );
  };

  const renderCamera = () => {
    return (
      <SafeAreaView style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          ref={ref}
          mode={mode}
          facing={facing}
          mute={false}
          mirror={true}
          responsiveOrientationWhenOrientationLocked
        />
        <View style={styles.shutterContainer}>
          <TouchableOpacity
            onPress={() => {
              const link = Platform.select({
                ios: "photos-redirect://",
                android: "content://media/external/images/media",
              });
              Linking.openURL(link!);
            }}
          >
            <AntDesign name="picture" size={32} color="white" />
          </TouchableOpacity>
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
                      backgroundColor: mode === "picture" ? "white" : "red",
                    },
                  ]}
                />
              </View>
            )}
          </Pressable>
          <TouchableOpacity onPress={toggleCameraFacing}>
            <FontAwesome6 name="rotate-left" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

  return (
    <View style={styles.container}>
      {uri ? renderPicture(uri) : renderCamera()}
      {/* <CameraView style={styles.camera} facing={facing} />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
          <Text style={styles.text}>Flip Camera</Text>
        </TouchableOpacity>
      </View> */}
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
