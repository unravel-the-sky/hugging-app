import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Loader from "../ui/Loader";
import { fixFirebaseUrl } from "@/lib/handleHugs";

export default function HugImage({ hugImagePath }: { hugImagePath: string }) {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

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
