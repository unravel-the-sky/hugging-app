import { savePushTokenOnUser, useCurrentUser } from "@/hooks/useCurrentUser";
import { auth } from "@/lib/firebaseConfig";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { signInAnonymously } from "firebase/auth";
import { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("@/assets/fonts/SpaceMono-Regular.ttf"),
    CuteFont: require("@/assets/fonts/JustMeAgainDownHere-Regular.ttf"),
  });

  const { user, loading } = useCurrentUser();
  const tokenRegisteredRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (tokenRegisteredRef.current) return;

    tokenRegisteredRef.current = true;

    const currentUser = auth.currentUser;

    if (currentUser) savePushTokenOnUser(currentUser.uid);
  }, [loading, user]);

  // useEffect(() => {
  //   if (!auth.currentUser) {
  //     signInAnonymously(auth);
  //   }
  // }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hide();
    }
  }, [error, loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="setup" />
      </Stack>
    </SafeAreaProvider>
  );
}
