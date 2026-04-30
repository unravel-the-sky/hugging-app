import Loader from "@/components/ui/Loader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIncomingHugs } from "@/hooks/useIncomingHugs";
import { auth } from "@/lib/firebaseConfig";
import { Tabs, router, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SetupScreen from "../setup";
import SignInScreen from "../sign-in";

export default function TabsLayout() {
  const { authUser, user, loading } = useCurrentUser();
  const [unreadHugsCount, setUnreadHugsCount] = useState<number>(0);

  const currentUser = auth.currentUser;
  const uid = currentUser?.uid;
  const { hugs, isLoading: isLoadingHugs } = useIncomingHugs(uid);

  const segments = useSegments();
  const isOnSetup = segments[0] === "setup";

  console.log(
    `TabsLayout is called, ${loading} and ${user} and userId: ${uid}`,
  );

  useEffect(() => {
    if (!isLoadingHugs) {
      const unSeenHugsCount = hugs.filter((item) => !item.seenAt).length;
      setUnreadHugsCount(unSeenHugsCount);
    }
  }, [hugs, isLoadingHugs]);

  // console.log("user from firebase is: ", user);

  if (!authUser && !isOnSetup) {
    return <SignInScreen />;
  }

  // extra case for anonymous users
  if (authUser?.isAnonymous && !isOnSetup && !__DEV__) {
    return <SignInScreen />;
  }

  if (authUser && !user && !isOnSetup) {
    return <SetupScreen />;
  }

  if (loading) {
    return <Loader />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Shared Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Text style={styles.usernameText}>@{user?.displayName || ""}</Text>
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
          name="friends"
          options={{
            title: "Friends",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👥</Text>,
          }}
        />
        <Tabs.Screen
          name="hugs"
          options={{
            title: "Hugs",
            tabBarIcon: ({ color }) => (
              <View>
                <Text style={{ fontSize: 24 }}>📬</Text>
                {unreadHugsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadHugsCount > 9 ? "9+" : unreadHugsCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
          listeners={{
            tabPress: () => {
              // maybe add something here later
            },
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
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  badgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "bold",
  },
});
