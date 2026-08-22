import AvatarPicker from "@/components/avatar/AvatarPicker";
import Loader from "@/components/ui/Loader";
import UsernameSetup from "@/components/user/UsernameSetup";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";

export default function SetupScreen() {
  const handleUsernameSet = async (userId: string, username: string) => {
    try {
      console.log("all went well, received userId: ", userId);
      await AsyncStorage.multiSet([
        ["userId", userId],
        ["displayName", username],
      ]);
    } catch (error: any) {
      console.error("Error saving username:", error);
    }
  };

  const { user, authUser, isHydrating } = useCurrentUser();

  // Signed in but the user doc is still in flight — `undefined` rather than
  // `null`. Asking for a username here would be asking someone who may well
  // already have one, so wait the moment out.
  if (isHydrating || (authUser && user === undefined)) {
    return <Loader />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {user === null ? (
        <UsernameSetup onUsernameSet={handleUsernameSet} />
      ) : (
        <AvatarPicker
          title="pick an avatar"
          saveLabel="let's go"
          onSaved={() => router.replace("/")}
          onOpenCamera={() => router.push("/avatar-camera")}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
});
