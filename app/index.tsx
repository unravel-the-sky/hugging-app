import HugController from "@/components/hug/HugController";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);

  const { user, loading } = useCurrentUser();

  useEffect(() => {
    checkAndLoadUsername();
  }, []);

  // useEffect(() => {
  //   resetUser().then(() => {
  //     alert("user deleted!");
  //   });
  // }, []);

  const checkAndLoadUsername = async () => {
    try {
      const storedUsername = await AsyncStorage.getItem("displayName");
      const storedUserId = await AsyncStorage.getItem("userId");
      if (!storedUsername || !storedUserId) {
        // No username, go to setup
        router.replace("/setup");
      } else {
        // setUserId(storedUserId);
      }
    } catch (error) {
      console.error("Error loading username:", error);
      router.replace("/setup");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.animatedContainer]}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.usernameText}>@{user?.displayName || ""}</Text>
          </View>

          {/* Hug stuff */}
          <HugController />

          {/* Footer - Placeholder for future navigation */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>footer</Text>
          </View>
        </GestureHandlerRootView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  usernameText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    marginTop: 24,
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#999",
  },
});
