import React from "react";
import { StyleSheet, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Avatar from "./Avatar";
import { avatarColor, readableText } from "@/lib/util";
import { colors } from "./theme";
import { useAvatarThumb } from "@/hooks/useAvatarThumbnail";

/** Thickness of the colored ring around a photo, in px. */
const RING = 0;

export const FriendAvatar = ({
  name,
  photoUri,
  online,
  size = 50,
  uid,
}: {
  name: string;
  /** Small thumb URL. When present, the colored circle becomes the ring. */
  photoUri?: string;
  online?: boolean;
  size?: number;
  uid?: string;
}) => {
  const color = avatarColor(name || "");
  const avatarUrl = useAvatarThumb(uid);

  return (
    <View style={{ width: size, height: size }}>
      {photoUri ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ExpoImage
            source={{ uri: photoUri }}
            style={{
              width: size - RING * 2,
              height: size - RING * 2,
              borderRadius: (size - RING * 2) / 2,
            }}
            contentFit="cover"
            transition={100}
          />
        </View>
      ) : avatarUrl ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ExpoImage
            source={{ uri: avatarUrl }}
            style={{
              width: size - RING * 2,
              height: size - RING * 2,
              borderRadius: (size - RING * 2) / 2,
            }}
            contentFit="cover"
            transition={100}
          />
        </View>
      ) : (
        <Avatar
          size={size}
          initials={name?.[0]?.toUpperCase() ?? "?"}
          color={color}
          textColor={readableText(color)}
        />
      )}

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
