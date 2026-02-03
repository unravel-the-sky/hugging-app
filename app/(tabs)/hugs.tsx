import { useIncomingHugs } from "@/hooks/useIncomingHugs";
import { auth } from "@/lib/firebaseConfig";
import { Hug } from "@/lib/handleHugs";
import { formatTimestamp } from "@/lib/util";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HugsListScreen() {
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid;
  const { isLoading, hugs } = useIncomingHugs(uid);

  console.log("whoa all the hugs i have received: ", hugs);

  const handleValidateHug = async (hugId: string) => {
    // try {
    //   // TODO: Validate hug in Firebase
    //   setHugs((prevHugs) =>
    //     prevHugs.map((hug) =>
    //       hug.id === hugId ? { ...hug, validated: true } : hug,
    //     ),
    //   );
    // } catch (error) {
    //   console.error("Error validating hug:", error);
    // }
  };

  const renderHugItem = ({ item }: { item: Hug }) => (
    <View style={styles.hugItem}>
      <View style={styles.hugIcon}>
        <Text style={styles.hugEmoji}>🤗</Text>
      </View>

      <View style={styles.hugInfo}>
        <Text style={styles.hugFrom}>@{item.fromName}</Text>
        <Text style={styles.hugTime}>
          {formatTimestamp(item.createdAt!.toDate())}
        </Text>
      </View>

      {/* {!item.validated ? (
        <TouchableOpacity
          style={styles.hugBackButton}
          onPress={() => handleValidateHug(item.id)}
        >
          <Text style={styles.hugBackText}>Hug Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.validatedBadge}>
          <Text style={styles.validatedText}>✓</Text>
        </View>
      )} */}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (hugs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🤗</Text>
        <Text style={styles.emptyTitle}>No hugs yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={hugs}
        renderItem={renderHugItem}
        keyExtractor={(item) => item.createdAt!.nanoseconds.toFixed(2)}
        contentContainerStyle={styles.listContainer}
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
  },
  hugItem: {
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
  hugIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFE8E8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  hugEmoji: {
    fontSize: 24,
  },
  hugInfo: {
    flex: 1,
  },
  hugFrom: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  hugTime: {
    fontSize: 14,
    color: "#999",
  },
  hugBackButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hugBackText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  validatedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  validatedText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
