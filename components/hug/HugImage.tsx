import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Loader from "../ui/Loader";

// this is some weird workaround for adding %2F instead of / on firebase downloadUrl
// fix this better when you have time
export const fixFirebaseUrl = (url: string): string => {
  // Match the path between /o/ and ? and re-encode any unencoded slashes
  return url.replace(/\/o\/([^?]+)/, (_, path) => {
    // Decode first (in case it's partially encoded), then re-encode
    const decoded = decodeURIComponent(path);
    return `/o/${encodeURIComponent(decoded)}`;
  });
};

export default function HugImage({ hugImagePath }: { hugImagePath: string }) {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // useEffect(() => {
  //   setLoading(true);
  //   const storage = getStorage();
  //   getDownloadURL(storageRef(storage, hugImagePath))
  //     .then(setImageUrl)
  //     .catch((err) => console.error("cannot downlad image"))
  //     .finally(() => {
  //       setLoading(false);
  //     });
  // }, [hugImagePath]);

  return (
    <View style={styles.imageContainer}>
      {loading ? (
        <Loader />
      ) : (
        <Image
          source={fixFirebaseUrl(hugImagePath)}
          style={styles.image}
          loading="eager"
          contentFit="contain"
          placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
        />
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
