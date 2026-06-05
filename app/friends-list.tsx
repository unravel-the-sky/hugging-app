import Loader from "@/components/ui/Loader";
import useCreateHugWithNote from "@/hooks/useCreateHugWithNote";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Friend } from "@/hooks/useFriends";
import { getFriendsForCurrentUser } from "@/lib/handleFriends";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

export default function FriendsListModal({ onPress }: { onPress: () => void }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user, loading } = useCurrentUser();

  const { startHugWithNote } = useCreateHugWithNote();

  useEffect(() => {
    if (user) loadFriends(user?.avatar || "");
  }, [user]);

  const loadFriends = async (userId: string) => {
    try {
      const friendsForCurrentUser = (await getFriendsForCurrentUser(
        userId,
      )) as Friend[];
      setFriends(friendsForCurrentUser);
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendHug = (friend: Friend) => {
    // Navigate to home screen to send hug
    // TODO: You might want to pre-select this friend when sending
    startHugWithNote(friend);
  };

  const renderFriendItem = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
      <View style={styles.friendAvatar}>
        <Text style={styles.friendInitial}>
          {item.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.friendInfo}>
        <Text style={styles.friendUsername}>{item.displayName}</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return <Loader />;
  }

  if (friends.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>👥</Text>
        <Text style={styles.emptyTitle}>No friends yet</Text>
        <Text style={styles.emptySubtitle}>
          Add friends to start sending hugs!
        </Text>
        <Pressable
          style={styles.addFriendButton}
          onPress={() => router.push("/add-user")}
        >
          <Text style={styles.addFriendButtonText}>Add Friend</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={friends}
        renderItem={renderFriendItem}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#FAFAFA",
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  addFriendButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addFriendButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Space for floating button
  },
  friendItem: {
    display: "flex",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
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
  friendAddedAt: {
    fontSize: 14,
    color: "#999",
  },
  hugButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFE8E8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  hugButtonEmoji: {
    fontSize: 24,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    fontSize: 24,
    color: "#999",
    fontWeight: "bold",
    marginTop: -2,
  },
  floatingButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButtonText: {
    fontSize: 32,
    color: "#FFF",
    fontWeight: "bold",
    marginTop: -2,
  },
});
