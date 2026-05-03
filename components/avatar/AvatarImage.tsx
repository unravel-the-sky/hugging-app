import { Image } from "react-native";
import { AvatarType } from "../user/Avatar";

const MaleFace = require("@/assets/images/hugFaceMaleImg.png");
const FemaleFace = require("@/assets/images/hugFaceFemaleImg.png");

type AvatarProps = {
  avatar?: AvatarType;
};

export default function AvatarImage({ avatar = "male" }: AvatarProps) {
  return (
    <Image
      source={avatar === "male" ? MaleFace : FemaleFace}
      style={{ width: 95, height: 90 }}
    />
  );
}
