import { Image } from "expo-image";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
} from "firebase/storage";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

export default function HugImage({ hugImagePath }: { hugImagePath: string }) {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const storage = getStorage();
    getDownloadURL(storageRef(storage, hugImagePath))
      .then(setImageUrl)
      .catch((err) => console.error("cannot downlad image"));
  }, [hugImagePath]);

  return (
    <View style={styles.imageContainer}>
      <Image source={imageUrl} style={styles.image} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    width: "100%",
    aspectRatio: 4 / 5,
    marginVertical: 16,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
