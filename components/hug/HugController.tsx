import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import HugButton from "./HugButton";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { auth } from "@/lib/firebaseConfig";
import { HugCreate, SendableHug, sendHug } from "@/lib/handleHugs";
import { scheduleOnRN } from "react-native-worklets";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius } from "../ui/squish";
import { rotate } from "@shopify/react-native-skia";

export type HugPhase =
  | "idle"
  | "hugging"
  | "formed"
  | "thrown"
  | "sending"
  | "pulling";

export type HugProps = {
  sendableHug: SendableHug;
  onComplete: () => void;
};

export default function HugController({ sendableHug, onComplete }: HugProps) {
  const hugPress = useSharedValue(0);

  const [hugPhase, setHugPhase] = useState<HugPhase>("idle");

  const { user } = useCurrentUser();

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
    console.log("Lifted, hugPhase ", hugPhase);
    if (hugPhase === "pulling" || hugPhase === "formed") return;
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

  const onSendHugProcess = async (phase: HugPhase) => {
    console.log("whoa phase", phase);
    if (phase === "thrown") {
      // here send an even to the parent and do an update on the firebase and such
      console.log(
        "hug is sent now, we are here, gonna make a hug object and send",
      );
      const hug: HugCreate = {
        from: auth.currentUser?.uid || "lol",
        fromName: user?.displayName || "",
        toName: sendableHug.toName,
        to: sendableHug.to,
        fromAvatar: user?.avatar || "male",
        note: sendableHug.note,
        imagePath: sendableHug.imagePath,
        seenAt: undefined, // toa avoid crash
      };

      console.log("created hug object: ", hug);
      await sendHug(hug);
      onComplete();
    }
    setHugPhase(phase);
  };

  const bgStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(hugPress.value, [0, 1], ["#fff", "#ffecff"]);

    return { backgroundColor: bg };
  });

  const getHugPhaseStatusText = useCallback(() => {
    if (hugPhase === "formed") return "now pull down and release!";
    if (hugPhase === "hugging") return "keep pressing!";
    if (hugPhase === "idle") return "press the button to form the hug!";
    if (hugPhase === "thrown") return "hug is thrown!";
    if (hugPhase === "pulling") return "pull down and release!";
  }, [hugPhase]);

  const progressBarStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      hugPress.value,
      [0, 1, 1.8, 2],
      [
        colors.mistBg, // yellow (charging)
        colors.primary, // green (sweet spot)
        "#6BCF63", // red (overhug)
        "#FF3B3B",
      ],
    );

    const progressPercent = interpolate(
      hugPress.value,
      [0, 2],
      [0, 200],
      Extrapolation.CLAMP,
    );

    return {
      backgroundColor,
      width: `${progressPercent}%`,
    };
  });

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <View
        style={{
          position: "absolute",
          top: 100,
          right: 0,
          zIndex: 5,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.7)",
            alignItems: "center",
            justifyContent: "center",
          }}
          hitSlop={8}
        >
          <Ionicons
            name="close-circle-outline"
            size={38}
            color={colors.plumInk}
          />
        </Pressable>
      </View>
      <View style={styles.progressContainer}>
        <Animated.View style={[styles.progressBar, progressBarStyle]} />
      </View>

      <Text style={styles.statusText}>{getHugPhaseStatusText()}</Text>

      <HugButton
        hugProgress={hugPress}
        hugPhase={hugPhase}
        onPressIn={startHug}
        onPressOut={releaseHug}
        onSendHugProcess={onSendHugProcess}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    paddingVertical: 16,
  },
  statusText: {
    // backgroundColor: colors.peach,
    transform: [{ rotate: "-1deg" }],
    borderRadius: radius.md,
    padding: 12,
    fontFamily: font.uiBold,
    fontSize: 18,
  },
  releaseText: {
    fontSize: 16,
  },
  progressContainer: {
    height: 15,
    width: "70%",
    position: "absolute",
    bottom: 100,
    backgroundColor: "#eee",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
});
