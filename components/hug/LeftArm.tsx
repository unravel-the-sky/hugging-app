import {
  BUTTON_SIZE,
  FANCY_ARM_WIDTH,
  LEFT_SHOULDER_OFFSET,
  MAIN_COLOR,
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
            d="M100.127 28.1264C101.86 28.0543 103.578 27.7768 105.245 27.2996L111.622 25.4744C118.846 23.4069 126.459 27.161 129.217 34.1504L131.649 40.3156C133.756 45.6557 130.471 51.5922 124.828 52.6437L105.018 54.4239L89.2789 53.7843L69.983 50.8169L57.517 47.0813C53.5489 45.8922 49.2804 46.2209 45.5411 48.0036C43.156 49.1406 40.5351 49.6953 37.8939 49.6219L37.6029 49.6139C34.5756 49.5298 31.5764 50.2151 28.886 51.6057L20.3617 56.0116C19.3122 56.554 18.0519 56.4894 17.0633 55.8425C15.8924 55.0763 15.3374 53.6509 15.6818 52.2946L15.9466 51.2517C16.259 50.0214 17.0476 48.9656 18.1389 48.317L23.1529 45.3368C23.941 44.8683 24.2033 43.8516 23.7403 43.0603C23.3765 42.4386 22.6547 42.1207 21.9504 42.2719L9.26264 44.9961C7.06579 45.4678 4.81432 44.476 3.67949 42.5367L3.59596 42.394C2.73265 40.9187 2.69904 39.1005 3.50724 37.5943C4.3277 36.0653 5.89453 35.0831 7.62828 35.011L19.4222 34.5206C20.0932 34.4927 20.4931 33.7605 20.1539 33.1808C20.0172 32.9472 19.7817 32.7884 19.5139 32.7494L3.35503 30.3906C2.43997 30.257 1.60156 29.8043 0.987895 29.1125C-0.314816 27.6439 -0.330796 25.4383 0.9505 23.951L1.17641 23.6887C2.0908 22.6273 3.46338 22.0756 4.858 22.2088L22.9137 23.9341C23.2849 23.9696 23.6265 23.7291 23.7183 23.3677C23.8156 22.9843 23.6009 22.5907 23.2258 22.465L7.66419 17.2485C5.91621 16.6626 4.69267 15.0822 4.56324 13.2432C4.42273 11.2468 5.59969 9.392 7.46577 8.6689L7.84975 8.52011C9.03685 8.06011 10.3527 8.05884 11.5407 8.51656L31.4948 16.2047C32.0446 16.4165 32.6611 16.3644 33.1676 16.0634C34.0755 15.5237 34.3777 14.3525 33.8443 13.4409L32.8797 11.7925L29.4897 5.99942C28.4307 4.18976 29.0307 1.86466 30.833 0.793349C33.5258 -0.807202 37.0069 0.0910493 38.589 2.79469L41.0222 6.95269L43.1557 10.5987C44.2324 12.4386 46.1582 13.6177 48.2864 13.74C50.4146 13.8624 52.3404 15.0415 53.417 16.8814L56.5149 22.1753C57.725 24.2433 59.8602 25.5988 62.2466 25.8141L66.554 26.2028L72.5538 27.0786L80.3584 27.9678C84.5559 28.446 88.7842 28.598 93.0052 28.4225L100.127 28.1264Z"
            fill={MAIN_COLOR}
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
