import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("@/assets/fonts/SpaceMono-Regular.ttf"),
    CuteFont: require("@/assets/fonts/JustMeAgainDownHere-Regular.ttf"),
  });

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
