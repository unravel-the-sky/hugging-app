import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type AvatarType = "male" | "female";

interface AvatarProps {
  type?: AvatarType;
  size?: number;
  username?: string;
}

const avatarEmojis = {
  male: "👨",
  female: "👩",
};

export default function Avatar({
  type = "male",
  size = 50,
  username,
}: AvatarProps) {
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {type ? (
        <Text style={[styles.emoji, { fontSize: size * 0.6 }]}>
          {avatarEmojis[type]}
        </Text>
      ) : username ? (
        <Text style={[styles.initial, { fontSize: size * 0.48 }]}>
          {username.charAt(0).toUpperCase()}
        </Text>
      ) : (
        <Text style={[styles.emoji, { fontSize: size * 0.6 }]}>👤</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    textAlign: "center",
  },
  initial: {
    fontWeight: "bold",
    color: "#FFF",
  },
});
