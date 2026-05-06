import { Image } from "expo-image";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
} from "firebase/storage";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Loader from "../ui/Loader";

export default function HugImage({ hugImagePath }: { hugImagePath: string }) {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const storage = getStorage();
    getDownloadURL(storageRef(storage, hugImagePath))
      .then(setImageUrl)
      .catch((err) => console.error("cannot downlad image"))
      .finally(() => {
        setLoading(false);
      });
  }, [hugImagePath]);

  return (
    <View style={styles.imageContainer}>
      {loading ? (
        <Loader />
      ) : (
        <Image source={imageUrl} style={styles.image} contentFit="contain" />
      )}
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
