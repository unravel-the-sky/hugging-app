import { Image, StyleSheet } from "react-native";
import { AvatarType } from "../user/Avatar";

const MaleFace = require("@/assets/images/hugFaceMaleImg.png");
const FemaleFace = require("@/assets/images/hugFaceFemaleImg.png");

type AvatarProps = {
  avatar?: AvatarType;
  size?: "s" | "m" | "l";
};

export default function AvatarImage({
  avatar = "male",
  size = "m",
}: AvatarProps) {
  return (
    <Image
      source={avatar === "male" ? MaleFace : FemaleFace}
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
