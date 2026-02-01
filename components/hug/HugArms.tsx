import { BUTTON_SIZE } from "@/constants";
import { StyleSheet, View } from "react-native";
import { SharedValue } from "react-native-reanimated";
import LeftArm from "./LeftArm";
import RightArm from "./RightArm";

export type HugArmProps = {
  hugProgress: SharedValue<number>;
};

export default function HugArms({ hugProgress }: HugArmProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      <LeftArm hugProgress={hugProgress} />
      <RightArm hugProgress={hugProgress} />
    </View>
  );
}

const leftHand = "✋";
const rightHand = "✋";

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
