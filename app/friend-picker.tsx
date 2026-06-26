import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Friend, useFriends } from "@/hooks/useFriends";
import { auth } from "@/lib/firebaseConfig";
import { UserFriend } from "@/lib/handleFriends";
import { sendHugRoomInvite } from "@/lib/handleHugRoom";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FriendPicker() {
  const { friends } = useFriends(auth.currentUser?.uid);
  const myId = auth.currentUser?.uid;
  const { user } = useCurrentUser();

  const handleSelectFriend = async (item: UserFriend) => {
    if (!myId || !user) return;

    const roomId = await sendHugRoomInvite(
      myId,
      item.id,
      user?.displayName,
      item.displayName,
    );

    console.log("hug room is created and roomId: ", roomId);

    if (roomId) {
      console.log("navigating back to hug-room");
      router.replace({
        pathname: "/hug-room",
        params: { roomId, partnerId: item.id },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        {/* <Text style={styles.title}>Choose someone to start a session</Text> */}
        <FlatList
          data={friends}
          keyExtractor={(f) => f.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={styles.friendItem}
              onPress={() => handleSelectFriend(item)}
            >
              <View style={styles.friendAvatar}>
                <Text style={styles.friendInitial}>
                  {item.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.friendInfo}>
                <Text style={styles.friendUsername}>{item.displayName}</Text>
              </View>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  title: {
    fontSize: 16,
    color: "#1A1A1A",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  listContent: {
    paddingTop: 52,
    paddingHorizontal: 24,
    paddingBottom: 32,
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
    shadowOpacity: 0.08,
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
  },
});
