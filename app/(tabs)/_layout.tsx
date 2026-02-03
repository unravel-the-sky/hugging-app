import { Tabs, router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function TabsLayout() {
  const [isLoading, setIsLoading] = useState(true);

  const { user, loading } = useCurrentUser();

  useEffect(() => {
    checkAndLoadUsername();
  }, []);

  // useEffect(() => {
  //   resetUser().then(() => {
  //     alert("user deleted!");
  //   });
  // }, []);

  const checkAndLoadUsername = async () => {
    try {
      const storedUsername = await AsyncStorage.getItem("displayName");
      const storedUserId = await AsyncStorage.getItem("userId");
      if (!storedUsername || !storedUserId) {
        // No username, go to setup
        router.replace("/setup");
      } else {
        // setUserId(storedUserId);
      }
    } catch (error) {
      console.error("Error loading username:", error);
      router.replace("/setup");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Shared Header */}
      <View style={styles.header}>
        <Text style={styles.usernameText}>@{user?.displayName || ""}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("./(tabs)/add-user")}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: "#FF6B6B",
          tabBarInactiveTintColor: "#999",
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Send Hug",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🤗</Text>,
          }}
        />
        <Tabs.Screen
          name="hugs"
          options={{
            title: "Hugs",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📬</Text>,
          }}
        />
        <Tabs.Screen
          name="add-user"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
    </SafeAreaView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  usernameText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 24,
    color: "#FFF",
    fontWeight: "bold",
    marginTop: -2,
  },
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#FFF",
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});
