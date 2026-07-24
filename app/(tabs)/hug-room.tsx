import { screen } from "@/components/hugroom/HugRoomComponents";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { spacing } from "@/components/ui/squish/theme";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function HugRoomScreen() {
  const router = useRouter();

  return (
    <View style={[screen.root, styles.root]}>
      <Text style={[screen.title, styles.title]}>Hug Room</Text>
      <Text style={screen.subtitle}>
        start a joint hug — same room, same moment. one of you opens it, the
        other hops in.
      </Text>

      <View style={styles.actions}>
        <PlushButton
          label="create room"
          variant="primary"
          fullWidth
          height={58}
          onPress={() => router.replace("/hugroom/create")}
        />
        <Text style={screen.caption}>
          make a code and share it with a friend
        </Text>

        <PlushButton
          label="join a room"
          variant="soft"
          fullWidth
          height={58}
          style={styles.joinButton}
          onPress={() => router.replace("/hugroom/join")}
        />
        <Text style={screen.caption}>got a code? come on in</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    justifyContent: "center",
  },
  title: {},
  actions: {
    marginTop: spacing.xl,
  },
  joinButton: {
    marginTop: spacing.xl,
  },
});
