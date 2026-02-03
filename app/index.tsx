import HugController from "@/components/hug/HugController";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/add-user")}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Hug stuff */}
          <HugController />

          {/* Footer - Placeholder for future navigation */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.footerButtonActive]}
            >
              <Text style={styles.footerEmoji}>🤗</Text>
              <Text style={[styles.footerText, styles.footerTextActive]}>
                Send Hug
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => router.push("/hugs")}
            >
              <Text style={styles.footerEmoji}>📬</Text>
              <Text style={styles.footerText}>Hugs</Text>
            </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 24,
    color: "#FFF",
    fontWeight: "bold",
    marginTop: -2,
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
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#FFF",
  },
  footerButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  footerButtonActive: {
    // borderBottomWidth: 2,
    // borderBottomColor: "#FF6B6B",
  },
  footerEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
  footerTextActive: {
    color: "#FF6B6B",
    fontWeight: "600",
  },
});
