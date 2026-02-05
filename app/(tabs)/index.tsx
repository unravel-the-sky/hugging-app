import HugController from "@/components/hug/HugController";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function HomeScreen() {
  const { toUid, toName, note } = useLocalSearchParams<{
    toUid: string;
    toName: string;
    note?: string;
  }>();

  console.log({ toUid, toName });

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {toUid && toName ? (
        <HugController
          toUid={toUid || ""}
          toDisplayName={toName || ""}
          note={note || ""}
        />
      ) : (
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Text>Welcome to Hug.me</Text>
            <Text>Welcome to Hug.me</Text>
            <Text>Welcome to Hug.me</Text>
            <Text>Welcome to Hug.me</Text>
            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.hugBackButton]}
                onPress={handleInitiateHug}
              >
                <Text style={styles.hugBackText}>Send a hug..</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
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
  },
  actionsContainer: {
    flexDirection: "row",
    width: "100%",
  },
  actionButton: {
    flex: 1,
    aspectRatio: 1.8,
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
