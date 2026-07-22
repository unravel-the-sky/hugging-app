import AvatarImage from "@/components/avatar/AvatarImage";
import Loader from "@/components/ui/Loader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFriends } from "@/hooks/useFriends";
import { useHugs } from "@/hooks/useIncomingHugs";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Label, router, useSegments } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../components/ui/squish/theme";
import { TabBarContext } from "../context/TabBarContext";
import SetupScreen from "../setup";
import SignInScreen from "../sign-in";
import ChangeAvatarSheet from "../change-avatar";

const getGreetingMessage = (): string => {
  const currentHour = new Date().getHours();
  let timeOfDay = "";

  if (currentHour >= 5 && currentHour < 12) {
    timeOfDay = "morning";
  } else if (currentHour >= 12 && currentHour < 18) {
    timeOfDay = "afternoon";
  } else {
    timeOfDay = "night"; // orEvening, depending on your preference
  }

  return `good ${timeOfDay},`;
};

export default function TabsLayout() {
  const { authUser, user, isHydrating } = useCurrentUser();
  const [unreadHugsCount, setUnreadHugsCount] = useState<number>(0);

  const [isTabBarHidden, setIsTabBarHidden] = useState(false);

  const { hugs, isLoading: isLoadingHugs } = useHugs();
  const { friendRequests } = useFriends();

  const segments = useSegments();
  const isOnSetup = segments[0] === "setup";

  const colorScheme = useColorScheme();

  console.log(
    `TabsLayout is called, isHydaring: ${isHydrating} and userId: ${user?.uid}`,
  );

  useEffect(() => {
    if (!isLoadingHugs) {
      const unSeenHugsCount = hugs.filter((item) => !item.seenAt).length;
      setUnreadHugsCount(unSeenHugsCount);
    }
  }, [hugs, isLoadingHugs]);

  if (isHydrating) {
    return <Loader />;
  }

  if (user && !user.avatar) {
    return <ChangeAvatarSheet />;
  }

  if (!authUser && !isOnSetup && !user) {
    return <SignInScreen />;
  }

  // extra case for anonymous users
  if (authUser?.isAnonymous && !isOnSetup && !__DEV__) {
    return <SignInScreen />;
  }

  if ((authUser && !isOnSetup && !user) || !user?.avatar) {
    return <SetupScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Shared Header */}
        <View style={styles.header}>
          <View>
            <Text style={{ fontFamily: "Fredoka_600SemiBold", fontSize: 16 }}>
              {getGreetingMessage()}
            </Text>
            <Text style={styles.usernameText}>{user?.displayName || ""}</Text>
          </View>
          <Pressable onPress={() => router.push("/profile")}>
            {user && <AvatarImage user={user} size="s" />}
            {/* <FriendAvatar
              name={"asdf"}
              photoUri={user.photoThumbPath ?? undefined}
            /> */}
          </Pressable>
        </View>

        {/* Tab Content */}
        <TabBarContext value={{ setIsTabBarHidden }}>
          <NativeTabs
            blurEffect="light"
            hidden={isTabBarHidden}
            iconColor={colors.primary}
          >
            <NativeTabs.Trigger name="index">
              <Label>Home</Label>
              <NativeTabs.Trigger.Icon sf="house.fill" md="settings" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="homepage" hidden>
              <Label>Homepage</Label>
              <NativeTabs.Trigger.Icon sf="house.fill" md="settings" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="friends">
              <Label>Friends</Label>
              <NativeTabs.Trigger.Icon sf="person.2.fill" md="settings" />
              {friendRequests.length > 0 && (
                <NativeTabs.Trigger.Badge>
                  {friendRequests.length > 9
                    ? "9+"
                    : friendRequests.length.toString()}
                </NativeTabs.Trigger.Badge>
              )}
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="hugs">
              <Label>Hugs</Label>
              <NativeTabs.Trigger.Icon sf="heart.circle.fill" md="settings" />
              {unreadHugsCount > 0 && (
                <NativeTabs.Trigger.Badge>
                  {unreadHugsCount > 9 ? "9+" : unreadHugsCount.toString()}
                </NativeTabs.Trigger.Badge>
              )}
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="hug-room" hidden>
              <Label>Hug room</Label>
              <NativeTabs.Trigger.Icon
                sf="person.crop.rectangle"
                md="settings"
              />
            </NativeTabs.Trigger>
          </NativeTabs>
        </TabBarContext>
      </SafeAreaView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lilac,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.lilac,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: colors.lilac,
  },
  usernameText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
});
