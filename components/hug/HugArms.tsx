import { BUTTON_SIZE, MAIN_COLOR } from "@/constants";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

export type HugArmProps = {
  hugProgress: SharedValue<number>;
  /**
   * Vertical position of the avatar. When it moves, the arms lag behind and
   * swing from the shoulder like a doll's — omit it and the arms stay rigid.
   */
  dragY?: SharedValue<number>;
};

const ARM_WIDTH = 80;
const ARM_HEIGHT = 47;
// The pivot sits past the inner edge of the arm, roughly at the centre of the
// avatar — that's the "shoulder" the arm swings from.
const SHOULDER_INSET = 24;
const FLAP_DEGREES = 10;
const FLAP_DURATION = 620;

// --- Swing physics -----------------------------------------------------------
// A spring "follower" chases the avatar's Y. Whatever distance it's behind by is
// the momentum the arms haven't caught up with yet, and that's what we turn into
// a shoulder rotation. Loose and underdamped so it overshoots and wobbles out.
const SWING_SPRING = { damping: 9, stiffness: 110, mass: 0.7 } as const;
// Lag pixels -> degrees of swing.
const SWING_PER_PX = 0.16;
const MAX_SWING_DEGREES = 26;
// A touch of vertical give at the shoulder, so the joint doesn't feel welded.
const SWING_DROOP_PER_PX = 0.05;
const MAX_SWING_DROOP = 5;
// Past this much drag the idle flap is fully muted — while you're moving the
// avatar the arms should only react to you, not keep waving on their own.
const FLAP_MUTE_DISTANCE = 30;

export default function HugArms({ hugProgress, dragY }: HugArmProps) {
  // -1 .. 1 loop; the arms only actually move once hugProgress opens them up.
  const flap = useSharedValue(0);

  useEffect(() => {
    flap.value = withRepeat(
      withTiming(1, {
        duration: FLAP_DURATION,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [flap]);

  // Distance from the arm's own centre out to the shoulder pivot.
  const PIVOT_DX = ARM_WIDTH / 2 + SHOULDER_INSET;

  // Springy follower trailing the avatar's Y position.
  const follower = useDerivedValue(() =>
    withSpring(dragY?.value ?? 0, SWING_SPRING),
  );

  // How far behind the body the arms currently are, in pixels. Positive while
  // the avatar is heading down, negative on the way back up.
  const lag = useDerivedValue(() => (dragY?.value ?? 0) - follower.value);

  // Degrees the arms swing up (positive) or down, mirrored per side below.
  const swing = useDerivedValue(() => {
    // Arms have to be out before they can swing.
    const grown = interpolate(
      hugProgress.value,
      [0.2, 0.6],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const raw = lag.value * SWING_PER_PX * grown;
    return Math.max(-MAX_SWING_DEGREES, Math.min(MAX_SWING_DEGREES, raw));
  });

  // Idle flap fades out as soon as the avatar is being dragged, and fades back
  // in once it springs home.
  const flapGate = useDerivedValue(() =>
    interpolate(
      Math.abs(dragY?.value ?? 0),
      [0, FLAP_MUTE_DISTANCE],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  );

  // The shoulder itself gives a little, opposite to the swing.
  const droopStyle = useAnimatedStyle(() => {
    const raw = -lag.value * SWING_DROOP_PER_PX;
    return {
      transform: [
        {
          translateY: Math.max(
            -MAX_SWING_DROOP,
            Math.min(MAX_SWING_DROOP, raw),
          ),
        },
      ],
    };
  });

  const leftFlapStyle = useAnimatedStyle(() => {
    const amplitude =
      interpolate(
        hugProgress.value,
        [0.2, 0.6],
        [0, FLAP_DEGREES],
        Extrapolation.CLAMP,
      ) * flapGate.value;
    const angle = (flap.value * 2 - 1) * amplitude;
    return {
      transform: [
        { translateX: PIVOT_DX },
        { rotate: `${-angle + swing.value}deg` },
        { translateX: -PIVOT_DX },
      ],
    };
  });

  const rightFlapStyle = useAnimatedStyle(() => {
    const amplitude =
      interpolate(
        hugProgress.value,
        [0.2, 0.6],
        [0, FLAP_DEGREES],
        Extrapolation.CLAMP,
      ) * flapGate.value;
    const angle = (flap.value * 2 - 1) * amplitude;
    return {
      transform: [
        { translateX: -PIVOT_DX },
        { rotate: `${angle - swing.value}deg` },
        { translateX: PIVOT_DX },
      ],
    };
  });

  const animatedLeftArmStyle = useAnimatedStyle(() => {
    const translateXVal = interpolate(hugProgress.value, [0, 1], [45, -70]);

    return {
      transform: [{ translateX: translateXVal }],
      opacity: 1,
    };
  });

  const animatedRightArmStyle = useAnimatedStyle(() => {
    const translateXVal = interpolate(hugProgress.value, [0, 1], [45, 185]);

    return {
      transform: [{ translateX: translateXVal }],
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

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.leftArm, animatedLeftArmStyle]}>
        <Animated.View style={droopStyle}>
          <Animated.View style={leftFlapStyle}>
            <Animated.View style={wristStyle}>
              <Svg width={80} height={47} viewBox="0 0 133 57">
                <Path
                  d="M100.127 28.1264C101.86 28.0543 103.578 27.7768 105.245 27.2996L111.622 25.4744C118.846 23.4069 126.459 27.161 129.217 34.1504L131.649 40.3156C133.756 45.6557 130.471 51.5922 124.828 52.6437L105.018 54.4239L89.2789 53.7843L69.983 50.8169L57.517 47.0813C53.5489 45.8922 49.2804 46.2209 45.5411 48.0036C43.156 49.1406 40.5351 49.6953 37.8939 49.6219L37.6029 49.6139C34.5756 49.5298 31.5764 50.2151 28.886 51.6057L20.3617 56.0116C19.3122 56.554 18.0519 56.4894 17.0633 55.8425C15.8924 55.0763 15.3374 53.6509 15.6818 52.2946L15.9466 51.2517C16.259 50.0214 17.0476 48.9656 18.1389 48.317L23.1529 45.3368C23.941 44.8683 24.2033 43.8516 23.7403 43.0603C23.3765 42.4386 22.6547 42.1207 21.9504 42.2719L9.26264 44.9961C7.06579 45.4678 4.81432 44.476 3.67949 42.5367L3.59596 42.394C2.73265 40.9187 2.69904 39.1005 3.50724 37.5943C4.3277 36.0653 5.89453 35.0831 7.62828 35.011L19.4222 34.5206C20.0932 34.4927 20.4931 33.7605 20.1539 33.1808C20.0172 32.9472 19.7817 32.7884 19.5139 32.7494L3.35503 30.3906C2.43997 30.257 1.60156 29.8043 0.987895 29.1125C-0.314816 27.6439 -0.330796 25.4383 0.9505 23.951L1.17641 23.6887C2.0908 22.6273 3.46338 22.0756 4.858 22.2088L22.9137 23.9341C23.2849 23.9696 23.6265 23.7291 23.7183 23.3677C23.8156 22.9843 23.6009 22.5907 23.2258 22.465L7.66419 17.2485C5.91621 16.6626 4.69267 15.0822 4.56324 13.2432C4.42273 11.2468 5.59969 9.392 7.46577 8.6689L7.84975 8.52011C9.03685 8.06011 10.3527 8.05884 11.5407 8.51656L31.4948 16.2047C32.0446 16.4165 32.6611 16.3644 33.1676 16.0634C34.0755 15.5237 34.3777 14.3525 33.8443 13.4409L32.8797 11.7925L29.4897 5.99942C28.4307 4.18976 29.0307 1.86466 30.833 0.793349C33.5258 -0.807202 37.0069 0.0910493 38.589 2.79469L41.0222 6.95269L43.1557 10.5987C44.2324 12.4386 46.1582 13.6177 48.2864 13.74C50.4146 13.8624 52.3404 15.0415 53.417 16.8814L56.5149 22.1753C57.725 24.2433 59.8602 25.5988 62.2466 25.8141L66.554 26.2028L72.5538 27.0786L80.3584 27.9678C84.5559 28.446 88.7842 28.598 93.0052 28.4225L100.127 28.1264Z"
                  fill={MAIN_COLOR}
                />
              </Svg>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <Animated.View
        style={[styles.rightArm, animatedRightArmStyle]}
      >
        <Animated.View style={droopStyle}>
          <Animated.View style={rightFlapStyle}>
            <Animated.View style={wristStyle}>
              <Svg width={80} height={47} viewBox="0 0 133 57">
                <Path
                  d="M32.3421 27.3599C30.6104 27.2679 28.8957 26.9706 27.2341 26.4742L20.8781 24.5756C13.6786 22.4251 6.02273 26.0913 3.18471 33.0485L0.681365 39.1853C-1.48691 44.5006 1.72937 50.4746 7.3604 51.591L27.1487 53.5993L42.8938 53.141L62.2226 50.3961L74.7308 46.8043C78.7124 45.661 82.9768 46.0389 86.6953 47.8645C89.0671 49.0289 91.6815 49.6137 94.3234 49.5708L94.6144 49.5661C97.6425 49.5169 100.634 50.2367 103.308 51.6582L111.781 56.162C112.824 56.7165 114.085 56.6664 115.081 56.0309C116.261 55.2782 116.832 53.8594 116.503 52.4992L116.25 51.4533C115.952 50.2194 115.176 49.1547 114.092 48.4935L109.113 45.4557C108.33 44.9782 108.079 43.9586 108.552 43.1727C108.923 42.5552 109.648 42.2456 110.35 42.4049L123.006 45.2751C125.197 45.772 127.46 44.8063 128.617 42.8802L128.702 42.7384C129.582 41.2732 129.637 39.4555 128.846 37.9401C128.043 36.4017 126.488 35.4015 124.755 35.3095L112.968 34.6832C112.297 34.6476 111.906 33.9108 112.251 33.3352C112.391 33.1031 112.628 32.9471 112.896 32.9111L129.081 30.7386C129.998 30.6156 130.842 30.1726 131.463 29.4879C132.783 28.0344 132.824 25.8291 131.56 24.3271L131.337 24.0623C130.435 22.9904 129.069 22.4229 127.673 22.5401L109.598 24.0573C109.227 24.0885 108.888 23.8441 108.8 23.4816C108.708 23.0971 108.927 22.706 109.303 22.5846L124.924 17.5478C126.679 16.982 127.92 15.4158 128.071 13.5784C128.234 11.5838 127.079 9.71553 125.221 8.97098L124.839 8.81777C123.657 8.34413 122.341 8.32771 121.148 8.77172L101.107 16.2295C100.555 16.435 99.9388 16.3758 99.4359 16.069C98.5342 15.5189 98.2455 14.3442 98.7894 13.4389L99.773 11.8016L103.229 6.048C104.309 4.25066 103.736 1.91881 101.946 0.826805C99.272 -0.804656 95.7808 0.0534406 94.1677 2.73868L91.6868 6.86838L89.5113 10.4896C88.4136 12.3169 86.4743 13.4738 84.3448 13.5716C82.2154 13.6695 80.2761 14.8263 79.1783 16.6537L76.0197 21.9115C74.7858 23.9654 72.6352 25.2963 70.2465 25.4841L65.9349 25.8231L59.9254 26.6297L52.1111 27.429C47.9083 27.8588 43.6786 27.9621 39.4599 27.738L32.3421 27.3599Z"
                  fill={MAIN_COLOR}
                />
              </Svg>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: "center",
    top: 25,
  },
  leftArm: {
    position: "absolute",
    top: 30,
    left: -40,
  },
  rightArm: {
    position: "absolute",
    top: 32,
    left: -40,
  },
});
