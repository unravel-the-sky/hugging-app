import { HugsProvider } from "@/app/context/HugsContext";
import { OfflineGate } from "@/components/ui/OfflineGate";
import { colors } from "@/components/ui/squish";
import { useBlocks } from "@/hooks/useBlocks";
import { savePushTokenOnUser, useCurrentUser } from "@/hooks/useCurrentUser";
import { GOOGLE_WEB_CLIENT_ID } from "@/lib/auth-config";
import { auth } from "@/lib/firebaseConfig";
import { Caveat_600SemiBold } from "@expo-google-fonts/caveat";
import {
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from "@expo-google-fonts/fredoka";
import {
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from "@expo-google-fonts/quicksand";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { SplashScreen, Stack, router } from "expo-router";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("@/assets/fonts/SpaceMono-Regular.ttf"),
    CuteFont: require("@/assets/fonts/JustMeAgainDownHere-Regular.ttf"),
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    Caveat_600SemiBold,
  });

  const { user, isHydrating } = useCurrentUser();
  const tokenRegisteredRef = useRef(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  useEffect(() => {
    if (isHydrating) return;
    if (!user) return;
    if (tokenRegisteredRef.current) return;

    tokenRegisteredRef.current = true;

    const currentUser = auth.currentUser;

    if (currentUser) savePushTokenOnUser(currentUser.uid);
  }, [isHydrating, user]);

  // Load who this user blocked before any list renders, and drop the list on
  // sign-out so the next user doesn't inherit it.
  const uid = user?.uid;
  useEffect(() => {
    const { refresh, clear } = useBlocks.getState();
    if (uid) refresh();
    else clear();
  }, [uid]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const hugId = response.notification.request.content.data?.hugId;
        console.log(
          "whoa hug is received, then making deepling for hugId: ",
          hugId,
        );
        if (!hugId) return;

        router.push(`/hugs?hugId=${hugId}`);
      },
    );

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hide();
    }
  }, [error, loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HugsProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="setup"
            options={{ headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen name="sign-in" />
          <Stack.Screen
            name="hug-note"
            options={{
              presentation: "modal",
              sheetGrabberVisible: true,
              headerTransparent: false,
              headerShadowVisible: true,
              headerLargeTitleShadowVisible: true,
              headerShown: false,
              contentStyle: { backgroundColor: "#FAFAFA" }, // semi-transparent background
            }}
          />
          <Stack.Screen
            name="account"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: "fitToContents",
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
              headerShown: false,
              contentStyle: { backgroundColor: "#FFFFFF" },
            }}
          />
          <Stack.Screen
            name="hug-back"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: "fitToContents",
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
              headerShown: false,
              contentStyle: { backgroundColor: "#FFFFFF" }, // match the card so any residual gap isn't grey
            }}
          />
          <Stack.Screen
            name="add-user"
            options={{
              presentation: "modal",
              sheetAllowedDetents: "fitToContents",
              sheetGrabberVisible: true,
              headerTransparent: false,
              headerShadowVisible: true,
              headerLargeTitleShadowVisible: true,
            }}
          />
          <Stack.Screen
            name="take-pic"
            options={{ headerShown: false, presentation: "fullScreenModal" }}
          />
          <Stack.Screen name="media" />
          <Stack.Screen
            name="send-hug"
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
          <Stack.Screen
            name="friend-stats"
            options={{
              presentation: "modal",
              sheetGrabberVisible: true,
              headerTransparent: false,
              headerShadowVisible: true,
              headerLargeTitleShadowVisible: true,
            }}
          />
          <Stack.Screen
            name="friend-picker"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: [0.5, 0.9], // half-screen and almost-full
              sheetInitialDetentIndex: 0, // open at 0.5
              sheetGrabberVisible: true, // adds the drag handle for free!
              headerShown: false, // cleaner look in a sheet
            }}
          />
          <Stack.Screen
            name="change-avatar"
            options={{
              presentation: "formSheet",
              sheetGrabberVisible: true,
              sheetAllowedDetents: "fitToContents",
              sheetCornerRadius: 28,
              headerShown: false,
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen name="avatar-camera" options={{ headerShown: false }} />
          <Stack.Screen
            name="blocked-people"
            options={{
              presentation: "modal",
              sheetGrabberVisible: true,
              headerTransparent: false,
              headerShadowVisible: true,
              headerLargeTitleShadowVisible: true,
            }}
          />
        </Stack>
        <OfflineGate />
      </HugsProvider>
    </GestureHandlerRootView>
  );
}
