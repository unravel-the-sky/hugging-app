import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
import { HugCreate, sendHug } from "@/lib/handleHugs";
import { scheduleOnRN } from "react-native-worklets";

export type HugPhase =
  | "idle"
  | "hugging"
  | "formed"
  | "thrown"
  | "sending"
  | "pulling";

export type HugProps = {
  toUid: string;
  toDisplayName: string;
};

export default function HugController({ toUid, toDisplayName }: HugProps) {
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
        toName: toDisplayName,
        to: toUid,
        seenAt: undefined, // toa avoid crash
      };

      console.log("created hug object: ", hug);
      await sendHug(hug);
    }
    setHugPhase(phase);
  };

  const bgStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(hugPress.value, [0, 1], ["#fff", "#ffecff"]);

    return { backgroundColor: bg };
  });

  const getHugPhaseStatusText = useCallback(() => {
    if (hugPhase === "formed") return "Hug is formed!";
    if (hugPhase === "hugging") return "Hug is hugging!";
    if (hugPhase === "idle") return "Hug is idle!";
    if (hugPhase === "thrown") return "Hug is thrown!";
  }, [hugPhase]);

  const progressBarStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      hugPress.value,
      [0, 1, 1.8, 2],
      [
        "#f8efcb", // yellow (charging)
        "#6BCF63", // green (sweet spot)
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
      <View></View>
      <View style={styles.progressContainer}>
        <Animated.View style={[styles.progressBar, progressBarStyle]} />
      </View>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>Send a hug to {toDisplayName}</Text>
        <Text style={styles.statusText}>{getHugPhaseStatusText()}</Text>
      </View>
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
    // backgroundColor: "#f7b7b7",
    height: "100%",
  },
  statusContainer: {
    marginBottom: 16,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    fontSize: 16,
  },
  releaseText: {
    fontSize: 16,
  },
  progressContainer: {
    height: 15,
    width: "70%",
    position: "absolute",
    top: 20,
    backgroundColor: "#eee",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
});
