import { StyleSheet, View } from "react-native";
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
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import HeartParticles from "./HeartParticles";
import { HugPhase } from "./HugController";
import { PlushButton } from "../ui/squish/PlushButton";
import { useState } from "react";

type HugButtonProps = {
  hugProgress: SharedValue<number>;
  hugPhase: HugPhase;
  onPressIn: () => void;
  onPressOut: () => void;
  onSendHugProcess: (val: HugPhase) => void;
};

const PULL_MULTIPLIER = 1.5;
const RELEASE_THRESHOLD = 80;
const THROW_TARGET = -800;
const THROW_VELOCITY = -2200;

export default function HugButton({
  hugProgress,
  hugPhase,
  onPressIn,
  onPressOut,
  onSendHugProcess,
}: HugButtonProps) {
  const translateY = useSharedValue(0);
  const canRelease = useSharedValue(false);
  const isPulling = useSharedValue(false);
  const pressed = useSharedValue(false); // drives the plush squish

  const { user } = useCurrentUser();

  const [isPressed, setIsPressed] = useState(false);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      // replaces Pressable.onPressIn
      pressed.value = true;
      scheduleOnRN(onPressIn);
      scheduleOnRN(setIsPressed, true);
    })
    .onUpdate((event) => {
      if (hugPhase === "hugging" || hugPhase === "idle") return;

      if (!isPulling.value) {
        // fire the phase change ONCE, not every frame
        isPulling.value = true;
        scheduleOnRN(onSendHugProcess, "pulling");
      }

      translateY.value = Math.max(0, event.translationY * PULL_MULTIPLIER);
      canRelease.value = translateY.value > RELEASE_THRESHOLD;
    })
    .onEnd(() => {
      if (canRelease.value) {
        scheduleOnRN(onSendHugProcess, "sending");
        translateY.value = withSpring(
          THROW_TARGET,
          { velocity: THROW_VELOCITY },
          (finished) => {
            if (!finished) return; // don't reset if the throw was interrupted
            translateY.value = 0;
            hugProgress.value = 0;
            scheduleOnRN(onSendHugProcess, "thrown");
          },
        );
      } else {
        translateY.value = withSpring(0);
        scheduleOnRN(onSendHugProcess, "idle");
      }
      canRelease.value = false;
    })
    .onFinalize(() => {
      // replaces Pressable.onPressOut — always fires, even on a tap with no pull
      pressed.value = false;
      isPulling.value = false;
      scheduleOnRN(onPressOut);
      scheduleOnRN(setIsPressed, false);
    });

  const hugContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const releaseTextStyle = useAnimatedStyle(() => ({
    opacity: withTiming(canRelease.value ? 1 : 0),
    transform: [{ translateY: withTiming(canRelease.value ? 0 : 6) }],
  }));

  const faceAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      hugProgress.value,
      [0, 1],
      [1, 1.8],
      Extrapolation.CLAMP,
    );
    const jiggleX = Math.sin(hugProgress.value * Math.PI * 18) * 2;
    return { transform: [{ scale }, { translateX: jiggleX }] };
  });

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      hugProgress.value,
      [0, 1],
      [1, 1.12],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }] };
  });

  return (
    <View style={styles.hugContainer}>
      <Animated.Text style={[styles.releaseText, releaseTextStyle]}>
        Release the hug
      </Animated.Text>

      {/* Avatar visual — never touchable */}
      <Animated.View
        style={[styles.button, animatedStyle]}
        pointerEvents="none"
      >
        <Animated.View style={hugContainerStyle}>
          <HugArms hugProgress={hugProgress} />
          <Animated.View style={faceAnimatedStyle}>
            <Face
              hugProgress={hugProgress}
              userAvatar={user?.avatar || "male"}
              photoUrl={user?.photoURL}
            />
            <HeartParticles
              active={
                hugPhase === "formed" ||
                hugPhase === "hugging" ||
                hugPhase === "pulling"
              }
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <View style={styles.touchArea}>
          <View pointerEvents="none">
            <PlushButton onPress={() => {}} label={"hug"} pressed={isPressed} />
          </View>
        </View>
      </GestureDetector>
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
  touchArea: {
    width: 200,
    height: 230,
    alignItems: "center",
    justifyContent: "center",
  },
});
