import {
  BUTTON_SIZE,
  FANCY_ARM_WIDTH,
  RIGHT_SHOULDER_OFFSET,
} from "@/constants";
import { StyleSheet } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { HugArmProps } from "./HugArms";

import Svg, { Path } from "react-native-svg";

export default function RightArm({ hugProgress }: HugArmProps) {
  const animatedRightArmStyle = useAnimatedStyle(() => {
    const elbowRotation = interpolate(
      hugProgress.value,
      [0, 1],
      [0, 4], // degrees
    );

    return {
      transform: [
        { translateY: RIGHT_SHOULDER_OFFSET },
        { translateX: -FANCY_ARM_WIDTH / 2 },
        { scaleX: hugProgress.value },
        // { scaleX: 1 },
        { translateX: FANCY_ARM_WIDTH / 2 },
        { rotate: `${elbowRotation}deg` },
      ],
      opacity: 1,
    };
  });

  const wristStyle = useAnimatedStyle(() => {
    const wrist = interpolate(
      hugProgress.value,
      [0.7, 1],
      [0, 4],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ rotate: `${wrist}deg` }],
    };
  });

  // return <Animated.View style={[styles.rightArm, animatedRightArmStyle]} />;

  return (
    <Animated.View style={[styles.rightArm, animatedRightArmStyle]}>
      <Animated.View style={wristStyle}>
        <Svg width={140} height={31} viewBox="0 0 139 31">
          <Path d="M0 6.07843L138 0V31L1.8 24.9216L0 6.07843Z" fill="#ff9c6b" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rightArm: {
    position: "absolute",
    left: BUTTON_SIZE / 2,
  },
});
