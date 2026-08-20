import HugController from "@/components/hug/HugController";
import { AppText } from "@/components/ui/AppText";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { useHugDraft } from "@/hooks/useHugDraft";
import { SendableHug } from "@/lib/handleHugs";
import { Redirect, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../components/ui/squish/theme";
import { Confetti } from "react-native-fast-confetti";

export default function SendHug() {
  const toUid = useHugDraft((s) => s.to);
  const toName = useHugDraft((s) => s.toName);
  const note = useHugDraft((s) => s.note);
  const imagePath = useHugDraft((s) => s.photoUri);
  const backgroundColor = useHugDraft((s) => s.backgroundColor);
  const resetAll = useHugDraft((s) => s.resetAll);

  console.log("hello im send-hug: ", { toUid, toName, note, imagePath });
  const [sendableHug, setSendableHug] = useState<SendableHug | undefined>(
    undefined,
  );
  const [hugIsSent, setHugIsSent] = useState(false);

  console.log("yello i am rendered and sendableHug: ", sendableHug);
  useEffect(() => {
    if (toUid && toName) {
      setSendableHug({
        to: toUid,
        toName: toName,
        note,
        imagePath,
        backgroundColor,
      });
    }
  }, [backgroundColor, imagePath, note, toName, toUid]);

  const handleCompleteHug = () => {
    console.log("i am called and resetting it");
    setHugIsSent(true);
    resetAll();
  };

  const handleResetHug = () => {
    setHugIsSent(false);
    setSendableHug(undefined);
    router.dismissTo("/(tabs)");
  };

  if (hugIsSent) {
    return (
      <View style={styles.emptyContainer}>
        <Confetti>
          <Confetti.Flake size={12} radius={6} />
          <Confetti.Flake width={8} height={14} />
          <Confetti.Flake width={8} height={14} radius={6.5} />
          <Confetti.Flake width={8} height={14} radius={4} />
        </Confetti>
        <AppText style={styles.emptyTitle}>Welldone!!</AppText>
        <AppText style={styles.emptySubtitle}>
          You sent a hug to {sendableHug?.toName || "lol"}
        </AppText>
        <PlushButton label="Yay" variant="blush" onPress={handleResetHug} />
      </View>
    );
  }

  if (!sendableHug) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <HugController sendableHug={sendableHug} onComplete={handleCompleteHug} />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: colors.lilac,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
});
