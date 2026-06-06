import { Friend } from "@/hooks/useFriends";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { radius } from "../ui/squish/theme";

type FriendRowProps = { item: Friend; onPress: (f: Friend) => void };

export const FriendRow = ({ item, onPress }: FriendRowProps) => {
  const press = useRef(new Animated.Value(0)).current;

  const animate = (to: number) =>
    Animated.spring(press, {
      toValue: to,
      useNativeDriver: false,
      speed: 40,
      bounciness: 6,
    }).start();

  const translateY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 5],
  });
  const shadowOpacity = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0],
  });
  const elevation = press.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 0],
  });

  return (
    <Pressable
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      onPress={() => onPress(item)}
    >
      <Animated.View
        style={[
          styles.friendItem,
          { transform: [{ translateY }], shadowOpacity, elevation },
        ]}
      >
        <View style={styles.friendAvatar}>
          <Text style={styles.friendInitial}>
            {item.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendUsername}>{item.displayName}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  friendInitial: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
  },
  friendInfo: {
    flex: 1,
  },
  friendUsername: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
});
