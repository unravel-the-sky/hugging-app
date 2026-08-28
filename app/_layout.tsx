import { HugsProvider } from "@/context/HugsContext";
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
// Only for setOptions — expo-router's re-export does not carry it, but both
// sit on the same native module, so the fade applies to the hide() below.
import { setOptions as setSplashOptions } from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";

// Hold the native splash from the moment this module loads. Without this the
// splash hides on its own schedule — before the fonts land and before the first
// screen has its safe-area insets — so the cold start is spent watching the
// home screen lay itself out. SplashScreen.hide() below only means anything
// once something is actually holding the splash open.
SplashScreen.preventAutoHideAsync();
setSplashOptions({ duration: 300, fade: true });

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
    // sign-out clears the stored token, so allow the next sign-in to re-register
    if (!user) {
      tokenRegisteredRef.current = false;
      return;
    }
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

  // Everything the first screen needs before it is worth looking at: the fonts
  // it renders text in, and the cached user that decides whether it shows the
  // tabs, the loader or the sign-in screen. `error` still counts as done —
  // a missing font should not leave the user staring at a splash forever.
  const ready = (loaded || error) && !isHydrating;

  useEffect(() => {
    if (!ready) return;

    // Two frames, not zero: the first commits this tree, the second lets the
    // insets the native side still owns — chiefly the tab bar's contribution to
    // the bottom inset, which initialWindowMetrics cannot know — land before
    // anyone sees the screen. Revealing on the first frame is what put the
    // button behind the tab bar for a beat.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => SplashScreen.hideAsync());
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* expo-router mounts a SafeAreaProvider of its own, but without initial
          metrics — so the first frame renders with every inset at 0 and the
          screen jumps once the native measurement arrives. These metrics are
          read synchronously at startup, so the first frame is already right. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
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
              name="report"
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
            <Stack.Screen
              name="avatar-camera"
              options={{ headerShown: false }}
            />
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
