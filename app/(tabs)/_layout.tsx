import { useAvatarTabIcon } from "@/components/avatar/AvatarTabIcon";
import Loader from "@/components/ui/Loader";
import { useUnreadHugsCount } from "@/hooks/useAllHugs";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFriends } from "@/hooks/useFriends";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Label, useSegments } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useState } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import { colors } from "../../components/ui/squish/theme";
import ChangeAvatarSheet from "../change-avatar";
import { TabBarContext } from "../context/TabBarContext";
import SetupScreen from "../setup";
import SignInScreen from "../sign-in";

export default function TabsLayout() {
  const { authUser, user, isHydrating } = useCurrentUser();
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);

  const { friendRequests } = useFriends();

  const segments = useSegments();
  const isOnSetup = segments[0] === "setup";

  const colorScheme = useColorScheme();

  const unreadHugsCount = useUnreadHugsCount();

  // the profile tab wears the user's own avatar, rendered off-screen and
  // snapshotted because iOS tab items only accept images
  const { source: avatarIconSource, snapshotView } = useAvatarTabIcon(
    user ?? undefined,
  );

  console.log(
    `TabsLayout is called, isHydaring: ${isHydrating} and userId: ${user?.uid}`,
  );

  if (isHydrating) {
    return <Loader />;
  }

  // Auth has confirmed someone, but their doc has not landed yet. Every branch
  // below reads `!user` as "no account", so without this the sign-in hand-off
  // falls through to SetupScreen for a frame.
  if (authUser && user === undefined) {
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
      <View style={styles.container}>
        {snapshotView}

        <TabBarContext value={{ setIsTabBarHidden }}>
          <NativeTabs
            blurEffect="extraLight"
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
            <NativeTabs.Trigger name="profile">
              <Label>You</Label>
              {avatarIconSource ? (
                // `original` keeps the photo's own colours — a templated
                // avatar would just be a purple blob
                <NativeTabs.Trigger.Icon
                  src={avatarIconSource}
                  renderingMode="original"
                />
              ) : (
                <NativeTabs.Trigger.Icon
                  sf="person.crop.circle"
                  md="settings"
                />
              )}
            </NativeTabs.Trigger>
          </NativeTabs>
        </TabBarContext>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lilac,
  },
});
