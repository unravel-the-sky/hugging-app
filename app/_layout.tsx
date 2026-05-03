import { savePushTokenOnUser, useCurrentUser } from "@/hooks/useCurrentUser";
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "@/lib/auth-config";
import { auth } from "@/lib/firebaseConfig";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { SplashScreen, Stack, router } from "expo-router";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("@/assets/fonts/SpaceMono-Regular.ttf"),
    CuteFont: require("@/assets/fonts/JustMeAgainDownHere-Regular.ttf"),
  });

  const { user, loading } = useCurrentUser();
  const tokenRegisteredRef = useRef(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (tokenRegisteredRef.current) return;

    tokenRegisteredRef.current = true;

    const currentUser = auth.currentUser;

    if (currentUser) savePushTokenOnUser(currentUser.uid);
  }, [loading, user]);

  useEffect(() => {
    console.log("HALLOOOO im registering the listener here");
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
      <>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="setup" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen
            name="hug-note"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: "fitToContents",
              // sheetAllowedDetents: [0.75],
              // sheetInitialDetentIndex: 1,
              sheetGrabberVisible: true,
              headerTransparent: false,
              headerShadowVisible: true,
              headerLargeTitleShadowVisible: true,
              sheetCornerRadius: 28,
              headerShown: false,
              contentStyle: { backgroundColor: "#FAFAFA" }, // semi-transparent background
            }}
          />
        </Stack>
      </>
    </GestureHandlerRootView>
  );
}
