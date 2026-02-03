import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";

interface Hug {
  id: string;
  from: string;
  timestamp: Date;
  validated: boolean;
}

export default function HugsListScreen() {
  const [hugs, setHugs] = useState<Hug[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHugs();
  }, []);

  const loadHugs = async () => {
    try {
      // TODO: Load hugs from Firebase
      // Simulating with dummy data for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const dummyHugs: Hug[] = [
        {
          id: "1",
          from: "alice",
          timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
          validated: false,
        },
        {
          id: "2",
          from: "bob",
          timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          validated: true,
        },
        {
          id: "3",
          from: "charlie",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          validated: false,
        },
      ];

      setHugs(dummyHugs);
    } catch (error) {
      console.error("Error loading hugs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateHug = async (hugId: string) => {
    try {
      // TODO: Validate hug in Firebase
      setHugs((prevHugs) =>
        prevHugs.map((hug) =>
          hug.id === hugId ? { ...hug, validated: true } : hug,
        ),
      );
    } catch (error) {
      console.error("Error validating hug:", error);
    }
  };

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const renderHugItem = ({ item }: { item: Hug }) => (
    <View style={styles.hugItem}>
      <View style={styles.hugIcon}>
        <Text style={styles.hugEmoji}>🤗</Text>
      </View>

      <View style={styles.hugInfo}>
        <Text style={styles.hugFrom}>@{item.from}</Text>
        <Text style={styles.hugTime}>{formatTimestamp(item.timestamp)}</Text>
      </View>

      {!item.validated ? (
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
      )}
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
        <Text style={styles.emptySubtitle}>
          Add friends and start sending hugs!
        </Text>
        <TouchableOpacity
          style={styles.addFriendButton}
          onPress={() => router.push("./(tabs)/add-user")}
        >
          <Text style={styles.addFriendButtonText}>Add Friends</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={hugs}
        renderItem={renderHugItem}
        keyExtractor={(item) => item.id}
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
