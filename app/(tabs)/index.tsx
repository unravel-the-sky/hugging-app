import HugController from "@/components/hug/HugController";
import { AppText } from "@/components/ui/AppText";
import { Logo } from "@/components/ui/Logo";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { useHugDraft } from "@/hooks/useHugDraft";
import { SendableHug } from "@/lib/handleHugs";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../components/ui/squish/theme";

export default function HomeScreen() {
  const toUid = useHugDraft((s) => s.to);
  const toName = useHugDraft((s) => s.toName);
  const note = useHugDraft((s) => s.note);
  const imagePath = useHugDraft((s) => s.photoUri);
  const reset = useHugDraft((s) => s.reset);

  console.log("hello: ", { toUid, toName, note, imagePath });
  const [sendableHug, setSendableHug] = useState<SendableHug | undefined>(
    undefined,
  );
  const [hugIsSent, setHugIsSent] = useState(false);

  console.log("yello i am rendered and sendableHug: ", sendableHug);
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

  const handleCompleteHug = () => {
    console.log("i am called and resetting it");
    setHugIsSent(true);
    reset();
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
    <>
      {sendableHug ? (
        <HugController
          sendableHug={sendableHug}
          onComplete={handleCompleteHug}
        />
      ) : (
        <SafeAreaView edges={["bottom"]} style={styles.overlay}>
          <View style={styles.container}>
            <AppText>Welcome to Hug.me!</AppText>
            <Text>
              Do you feel like you need a hug? Or would you like to send a hug?
              🥹
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
            <Text>
              Then click the button, choose a human and send some luuuvvv
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
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // move this to an egen coponent later
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
    padding: 20,
    backgroundColor: colors.soft,
  },
  container: {
    backgroundColor: colors.soft,
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
