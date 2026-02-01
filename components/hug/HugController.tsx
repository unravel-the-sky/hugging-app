import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import HugButton from "./HugButton";

import * as Haptics from "expo-haptics";
import { scheduleOnRN } from "react-native-worklets";

export type HugPhase = "idle" | "hugging" | "formed" | "thrown";

export default function HugController() {
  const hugPress = useSharedValue(0);
  const translateY = useSharedValue(0);

  const [hugPhase, setHugPhase] = useState<HugPhase>("idle");

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  useEffect(() => {
    console.log("yello2");
  }, []);

  const startHug = () => {
    console.log("starting to hugggg");
    setHugPhase("hugging");
    hugPress.value = withTiming(
      1,
      {
        duration: 1800,
      },
      (isFinished) => {
        scheduleOnRN(setHugPhase, isFinished ? "formed" : "hugging");
      },
    );
  };

  const releaseHug = () => {
    // if (hugPhase === "formed") return;
    console.log("Lifted");
    hugPress.value = withSpring(
      0,
      {
        duration: 300,
      },
      () => {
        scheduleOnRN(setHugPhase, "idle");
      },
    );
  };

  const bgStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      translateY.value,
      [0, 120],
      ["#fff", "#ffe6eb"],
    );

    return { backgroundColor: bg };
  });

  const getHugPhaseStatusText = useCallback(() => {
    if (hugPhase === "formed") return "Hug is formed!";
    if (hugPhase === "hugging") return "Hug is hugging!";
    if (hugPhase === "idle") return "Hug is idle!";
    if (hugPhase === "thrown") return "Hug is thrown!";
  }, [hugPhase]);

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{getHugPhaseStatusText()}</Text>
      </View>
      <HugButton
        hugProgress={hugPress}
        hugPhase={hugPhase}
        onPressIn={startHug}
        onPressOut={releaseHug}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
  },
  releaseText: {
    fontSize: 16,
  },
});
