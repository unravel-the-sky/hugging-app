import HugController from "@/components/hug/HugController";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function HomeScreen() {
  const { toUid, toName } = useLocalSearchParams<{
    toUid: string;
    toName: string;
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HugController toUid={toUid || ""} toDisplayName={toName || ""} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({});
