import { DriftingAvatars } from "@/components/landing/DriftingAvatars";
import { AppText } from "@/components/ui/AppText";
import { Logo } from "@/components/ui/Logo";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { useHugDraft } from "@/hooks/useHugDraft";
import { SendableHug } from "@/lib/handleHugs";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font } from "../../components/ui/squish/theme";

export default function HomeScreen() {
  const toUid = useHugDraft((s) => s.to);
  const toName = useHugDraft((s) => s.toName);
  const note = useHugDraft((s) => s.note);
  const imagePath = useHugDraft((s) => s.photoUri);

  console.log("hello im index: ", { toUid, toName, note, imagePath });
  const [sendableHug, setSendableHug] = useState<SendableHug | undefined>(
    undefined,
  );
  const [hugIsSent, setHugIsSent] = useState(false);

  useEffect(() => {
    if (toUid && toName) {
      setSendableHug({ to: toUid, toName: toName, note, imagePath });
    }
  }, [imagePath, note, toName, toUid]);

  const handleInitiateHug = () => {
    console.log("send to friends here");
    router.push({
      pathname: "/(tabs)/friends",
    });
  };

  const handleResetHug = () => {
    setHugIsSent(false);
    setSendableHug(undefined);
  };

  if (hugIsSent) {
    return (
      <View style={styles.emptyContainer}>
        <AppText style={styles.emptyTitle}>Welldone!!</AppText>
        <AppText style={styles.emptySubtitle}>
          You sent a hug to {sendableHug?.toName || "lol"}
        </AppText>
        <Pressable
          style={styles.addFriendButton}
          onPress={() => handleResetHug()}
        >
          <Text style={styles.addFriendButtonText}>Yay!</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.overlay}>
      <DriftingAvatars count={5} intensity={90} />
      <View style={styles.container}>
        <AppText variant="title">Hugging app</AppText>
        <Text style={styles.mainText}>
          Do you feel like you need a hug? Or would you like to send a hug?
        </Text>
        <View
          style={{
            display: "flex",
            width: "100%",
            padding: 8,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Logo />
        </View>
        <Text style={styles.mainText}>
          Then click the button, choose a hugging friend and send some luuuvvv
        </Text>
        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <PlushButton
            onPress={handleInitiateHug}
            label="send a hug 🥹"
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // move this to an egen coponent later
  mainText: {
    fontFamily: font.ui,
    fontSize: 14,
    color: colors.plumInk,
    marginTop: 2,
  },
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
  addFriendButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addFriendButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.soft,
  },
  container: {
    // backgroundColor: colors.soft,
    borderRadius: 24,
    padding: 20,
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "space-between",
    fontSize: 26,
    fontFamily: "CuteFont",
  },
  containerText: {
    fontSize: 20,
  },
  actionsContainer: {
    width: "100%",
  },
});
