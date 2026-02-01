import {
  BUTTON_SIZE,
  FANCY_ARM_WIDTH,
  LEFT_SHOULDER_OFFSET,
} from "@/constants";
import { StyleSheet } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { HugArmProps } from "./HugArms";

export default function LeftArm({ hugProgress }: HugArmProps) {
  const animatedLeftArmStyle = useAnimatedStyle(() => {
    const elbowRotation = interpolate(
      hugProgress.value,
      [0, 1],
      [0, -4], // degrees
    );

    return {
      transform: [
        { translateY: LEFT_SHOULDER_OFFSET },
        { translateX: FANCY_ARM_WIDTH },
        { scaleX: hugProgress.value },
        // { scaleX: 1 },
        { translateX: -FANCY_ARM_WIDTH },
        { rotate: `${elbowRotation}deg` },
      ],
      opacity: 1,
    };
  });

  const wristStyle = useAnimatedStyle(() => {
    const wrist = interpolate(
      hugProgress.value,
      [0.7, 1],
      [0, -4],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ rotate: `${wrist}deg` }],
    };
  });

  // return <Animated.View style={[styles.leftArm, animatedLeftArmStyle]} />;

  return (
    <Animated.View style={[styles.leftArm, animatedLeftArmStyle]}>
      <Animated.View style={wristStyle}>
        <Svg width={140} height={31} viewBox="0 0 139 31">
          <Path
            d="M138.038 25.8436L-1.84773e-05 30.9993L0.207241 -1.02365e-05L136.364 6.98889L138.038 25.8436Z"
            fill="#ff9c6b"
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  leftArm: {
    position: "absolute",
    right: BUTTON_SIZE / 2,
  },
});
