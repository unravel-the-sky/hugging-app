import { AvatarType, User } from "@/lib/createUser";
import { Image as ExpoImage } from "expo-image";
import { Image, StyleSheet } from "react-native";

const MaleFace = require("@/assets/images/hugFaceMaleImg.png");
const FemaleFace = require("@/assets/images/hugFaceFemaleImg.png");

type Size = "s" | "m" | "l";

// Diameter (px) for photo avatars — square, rendered as a circle.
// Mirrors the *widths* of the drawn faces so the two kinds sit at the
// same visual size wherever they're swapped in.
const PHOTO_DIAMETER: Record<Size, number> = { s: 40, m: 95, l: 120 };

type AvatarProps = {
  avatar?: AvatarType;
  photoURL?: string;
  photoThumbURL?: string;
  /**
   * Convenience: pass a user (or friend) and avatar/photoURL/photoThumbURL
   * are read off it. Lets call sites do `<AvatarImage user={friend} />`
   * instead of spreading three props everywhere.
   */
  user?: Pick<User, "avatar" | "photoURL" | "photoThumbURL">;
  size?: Size;
};

export default function AvatarImage({
  avatar,
  photoURL,
  photoThumbURL,
  user,
  size = "m",
}: AvatarProps) {
  // Explicit props win; otherwise read from `user`; otherwise default.
  const type: AvatarType = avatar ?? user?.avatar ?? "male";
  const url = photoURL ?? user?.photoURL;
  const thumb = photoThumbURL ?? user?.photoThumbURL;

  if (type === "photo" && (url || thumb)) {
    const d = PHOTO_DIAMETER[size];
    // "s" is used in dense lists — the 96px thumb is plenty there. At m/l
    // the thumb would upscale and look soft on 3x screens, so use the full
    // image and let the thumb stand in as an instant placeholder.
    const useFull = size !== "s" && !!url;
    return (
      <ExpoImage
        source={{ uri: useFull ? url : (thumb ?? url) }}
        placeholder={useFull && thumb ? { uri: thumb } : undefined}
        style={{ width: d, height: d, borderRadius: d / 2 }}
        contentFit="cover"
        transition={100}
      />
    );
  }

  // Drawn face. Note: default + anything non-female → male (this also
  // covers a "photo" type that has no URL yet, so it degrades to a face
  // rather than rendering nothing).
  return (
    <Image
      source={type === "female" ? FemaleFace : MaleFace}
      style={[
        styles.avatar,
        size === "s"
          ? styles.small
          : size === "m"
            ? styles.medium
            : styles.large,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    display: "flex",
  },
  small: {
    width: 30,
    height: 28,
  },
  medium: {
    width: 95,
    height: 90,
  },
  large: {
    width: 120,
    height: 112,
  },
});
