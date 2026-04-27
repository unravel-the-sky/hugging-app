import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { getFriendsForCurrentUser } from "@/lib/handleFriends";
import HugNoteModal from "@/components/hug/HugNoteModal";
import Loader from "@/components/ui/Loader";
import { auth } from "@/lib/firebaseConfig";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export type Friend = {
  uid: string;
  displayName: string;
  addedAt?: Date;
};

export default function FriendsListScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [noteModalVisible, setNoteModalVisible] = useState(false);

  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (user) loadFriends(user?.avatar || "");
  }, [user]);

  useEffect(() => {
    console.log("noteModalVisible changed: ", noteModalVisible);
  }, [noteModalVisible]);

  const loadFriends = async (userId: string) => {
    try {
      // the shiiiit
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

  const handleRemoveFriend = (friendId: string, username: string) => {
    Alert.alert(
      "Remove Friend",
      `Remove people already?? Whoaaa bad karma. And nope. (didn't implement it yet lol)`,
      [
        {
          text: "Nope",
          style: "cancel",
        },
        {
          text: "Ok da",
          style: "default",
          onPress: async () => {
            // try {
            //   // TODO: Remove friend from Firebase
            //   setFriends((prevFriends) =>
            //     prevFriends.filter((f) => f.uid !== friendId),
            //   );
            // } catch (error) {
            //   console.error("Error removing friend:", error);
            //   Alert.alert("Error", "Failed to remove friend");
            // }
          },
        },
      ],
    );
  };

  const handleSendHug = (friend: Friend) => {
    // Navigate to home screen to send hug
    // TODO: You might want to pre-select this friend when sending
    setSelectedFriend(friend);
    setNoteModalVisible(true);
  };

  const handleContinueWithNote = (
    friendName: string,
    friendUid: string,
    note?: string,
  ) => {
    router.push({
      pathname: "/(tabs)",
      params: {
        toUid: friendUid,
        toName: friendName,
        note: note,
      },
    });
    setSelectedFriend(null);
    setNoteModalVisible(false);
  };
  const handleCancelNote = () => {
    setNoteModalVisible(false);
  };

  const renderFriendItem = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
      <View style={styles.friendAvatar}>
        <Text style={styles.friendInitial}>
          {item.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.friendInfo}>
        <Text style={styles.friendUsername}>@{item.displayName}</Text>
        <Text style={styles.friendAddedAt}>Friend</Text>
      </View>

      <TouchableOpacity
        style={styles.hugButton}
        onPress={() => handleSendHug(item)}
      >
        <Text style={styles.hugButtonEmoji}>🤗</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFriend(item.uid, item.displayName)}
      >
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
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
        <TouchableOpacity
          style={styles.addFriendButton}
          onPress={() => router.push("/(tabs)/add-user")}
        >
          <Text style={styles.addFriendButtonText}>Add Friend</Text>
        </TouchableOpacity>
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

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.push("/(tabs)/add-user")}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      <HugNoteModal
        visible={noteModalVisible}
        friendName={selectedFriend?.displayName || ""}
        friendUid={selectedFriend?.uid || ""}
        onContinue={handleContinueWithNote}
        onCancel={handleCancelNote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
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
    bottom: 20,
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
