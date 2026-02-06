import HugController from "@/components/hug/HugController";
import { AppText } from "@/components/ui/AppText";
import { SendableHug } from "@/lib/handleHugs";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function HomeScreen() {
  const { toUid, toName, note } = useLocalSearchParams<{
    toUid: string;
    toName: string;
    note?: string;
  }>();

  console.log({ toUid, toName });
  const [sendableHug, setSendableHug] = useState<SendableHug | undefined>(
    undefined,
  );
  const [hugIsSent, setHugIsSent] = useState(false);

  console.log("yello i am rendered and sendableHug: ", sendableHug);
  useEffect(() => {
    if (toUid && toName) {
      setSendableHug({ to: toUid, toName: toName, note: note });
    }
  }, [note, toName, toUid]);

  useEffect(() => {
    if (!toUid) {
      // Alert.alert("Oh nou", "Pls select a friend to send hug to, tenks");
      // router.push({
      //   pathname: "/(tabs)/friends",
      // });
    }
  }, [toUid]);

  const handleInitiateHug = () => {
    console.log("send to friends here");
    router.push({
      pathname: "/(tabs)/friends",
    });
  };

  const handleCompleteHug = () => {
    console.log("i am called and resetting it");
    setHugIsSent(true);
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      {sendableHug ? (
        <HugController
          toUid={sendableHug.to || ""}
          toDisplayName={sendableHug.toName || ""}
          note={sendableHug.note || ""}
          onComplete={handleCompleteHug}
        />
      ) : (
        <View style={styles.overlay}>
          <View style={styles.container}>
            <AppText>Welcome to Hug.me</AppText>
            <Text>
              Do you feel like you need a hug? r would you like to send one hug?
            </Text>
            <Text>
              Then click the button, choose a friend and send some luuuvvv
            </Text>
            <Text>doooo iiitttt</Text>
            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <Pressable
                onPress={handleInitiateHug}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.hugBackButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <AppText style={styles.hugBackText}>Send a hug 🥹</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // move this to an egen coponent later
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#FAFAFA",
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
  },
  container: {
    backgroundColor: "#FAFAFA",
    borderRadius: 24,
    padding: 32,
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
    flexDirection: "row",
    width: "100%",
  },
  actionButton: {
    flex: 1,
    aspectRatio: 3,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  hugBackButton: {
    backgroundColor: "#ffbf6b",
    borderColor: "#d19b53",
    borderWidth: 5,
    borderStyle: "dashed",
  },
  buttonPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    elevation: 1,
  },
  hugBackEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  hugBackText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
