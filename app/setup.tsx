import UsernameSetup from "@/components/user/UsernameSetup";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";

export default function SetupScreen() {
  const handleUsernameSet = async (userId: string, username: string) => {
    try {
      console.log("all went well, received userId: ", userId);
      // await AsyncStorage.multiSet([
      //   ["userId", userId],
      //   ["displayName", username],
      // ]);

      router.replace("/");
    } catch (error: any) {
      console.error("Error saving username:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <UsernameSetup onUsernameSet={handleUsernameSet} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
});
