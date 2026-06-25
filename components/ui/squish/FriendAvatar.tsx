import React from "react";
import { StyleSheet, View } from "react-native";
import Avatar from "./Avatar";
import { avatarColor, readableText } from "@/lib/util";
import { colors } from "./theme";

export const FriendAvatar = ({
  name,
  online,
  size = 50,
}: {
  name: string;
  online?: boolean;
  size?: number;
}) => {
  const color = avatarColor(name);
  return (
    <View style={{ width: size, height: size }}>
      <Avatar
        size={size}
        initials={name?.[0]?.toUpperCase() ?? "?"}
        color={color}
        textColor={readableText(color)}
      />
      {online && (
        <View
          style={[
            styles.dot,
            { borderColor: colors.surface, backgroundColor: colors.mint },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
  },
});
