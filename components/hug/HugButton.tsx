import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Face } from "./Face";
import HugArms from "./HugArms";

import { BUTTON_SIZE } from "@/constants";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { HugPhase } from "./HugController";

type HugButtonProps = {
  hugProgress: SharedValue<number>;
  hugPhase: HugPhase;
  onPressIn: () => void;
  onPressOut: () => void;
};

export default function HugButton({
  hugProgress,
  hugPhase,
  onPressIn,
  onPressOut,
}: HugButtonProps) {
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const canRelease = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // console.log("hugPhase ", hugPhase);
      if (hugPhase !== "formed") return;

      console.log("translateY.value is: ", translateY.value);

      // drag only downward
      translateY.value = Math.max(0, event.translationY * 1.5);

      // threshold to release the hug
      canRelease.value = translateY.value > 80; // test this value
    })
    .onEnd(() => {
      isDragging.value = false;

      if (canRelease.value) {
        // throw the slingshotttt
        translateY.value = withSpring(-600, {
          velocity: -1200,
          damping: 14,
          stiffness: 160,
        });
      } else {
        // snap it back
        translateY.value = withSpring(0);
      }

      canRelease.value = false;
    });

  const hugContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const releaseTextStyle = useAnimatedStyle(() => ({
    opacity: withTiming(canRelease.value ? 1 : 0),
    transform: [
      {
        translateY: withTiming(canRelease.value ? 0 : 6),
      },
    ],
  }));

  const faceAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      hugProgress.value,
      [0, 1],
      [1, 2],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }],
    };
  });

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      hugProgress.value,
      [0, 1],
      [1, 1.12],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.hugContainer}>
      <Animated.Text style={[styles.releaseText, releaseTextStyle]}>
        Release the hug
      </Animated.Text>
      <Animated.View style={[styles.button, animatedStyle]}>
        <Animated.View style={styles.faceWrapper}>
          <Animated.View style={hugContainerStyle}>
            <HugArms hugProgress={hugProgress} />
            <Animated.View style={faceAnimatedStyle}>
              <Face hugProgress={hugProgress} />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <Pressable
        disabled={hugProgress.value > 0.98}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        pressRetentionOffset={50}
      >
        <GestureDetector gesture={panGesture}>
          <View
            style={{
              width: 100,
              height: 130,
              backgroundColor: "green",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text>HUG</Text>
          </View>
        </GestureDetector>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hugContainer: {
    display: "flex",
    width: "auto",
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  faceWrapper: {
    transform: [{ scale: 1 }],
  },
  releaseText: {
    fontSize: 16,
  },
});
