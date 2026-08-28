import { DriftingAvatars } from "@/components/landing/DriftingAvatars";
import { Logo } from "@/components/ui/Logo";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { colors, font, radius } from "@/components/ui/squish/theme";
import { APP_NAME } from "@/constants";
import AntDesign from "@expo/vector-icons/AntDesign";
import { auth } from "@/lib/firebaseConfig";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  linkWithCredential,
  OAuthProvider,
  signInAnonymously,
  signInWithCredential,
} from "firebase/auth";
import React, { useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// TODO: point these at the real hosted pages before submitting to the stores.
// App Review rejects under 5.1.1(i) if these are unreachable or placeholder.
const TERMS_URL = "https://example.com/terms";
const PRIVACY_URL = "https://example.com/privacy";

/** Mirrors PlushButton's default face height and its DEPTH constant. */
const BUTTON_HEIGHT = 52;
const BUTTON_DEPTH = 5;

export default function SignInScreen() {
  const [isLoading, setIsLoading] = useState(false);

  // Distinguish "first-time user" from "existing anonymous user upgrading"
  const isExistingUser = auth.currentUser?.isAnonymous ?? false;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error("No ID token returned from Google");
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const currentUser = auth.currentUser;

      if (currentUser?.isAnonymous) {
        await linkWithCredential(currentUser, credential);
      } else {
        await signInWithCredential(auth, credential);
      }
      // onAuthStateChanged will fire from useCurrentUser; routing updates automatically
    } catch (error: any) {
      handleSignInError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInError = (error: any) => {
    if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
      return;
    }
    if (error?.code === statusCodes.IN_PROGRESS) {
      return;
    }
    if (error?.code === "auth/credential-already-in-use") {
      Alert.alert(
        "Account already exists",
        `This Google account is already linked to another ${APP_NAME} account. Please contact support.`,
      );
      return;
    }
    if (error?.message?.includes("network")) {
      Alert.alert("No internet", "Please check your connection and try again.");
      return;
    }

    console.error("Sign-in error:", error);
    Alert.alert("Sign-in failed", "Something went wrong. Please try again.");
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      // 1. make a raw nonce, hash it for Apple
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      // 2. Apple gets the HASHED nonce
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const { identityToken } = credential;
      if (!identityToken)
        throw new Error("No identity token returned from Apple");

      // 3. Firebase gets the RAW nonce
      const provider = new OAuthProvider("apple.com");
      const firebaseCredential = provider.credential({
        idToken: identityToken,
        rawNonce,
      });

      const currentUser = auth.currentUser;
      if (currentUser?.isAnonymous) {
        await linkWithCredential(currentUser, firebaseCredential);
      } else {
        await signInWithCredential(auth, firebaseCredential);
      }
    } catch (error) {
      handleAppleSignInError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignInError = (error: any) => {
    if (error?.code === "ERR_REQUEST_CANCELED") {
      return;
    }

    if (error?.code === "auth/credential-already-in-use") {
      Alert.alert(
        "Account already exists",
        `This Apple account is already linked to another ${APP_NAME} account. Please contact support.`,
      );
      return;
    }

    console.error("Apple Sign-in error:", error);
    Alert.alert("Sign-in failed", "Something went wrong. Please try again.");
  };

  return (
    <View style={styles.root}>
      {/* Background: theme-colored avatars drifting under a full-screen blur pane. */}
      <DriftingAvatars intensity={80} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.content}>
          {/* Wordmark */}
          <View style={styles.brand}>
            <Image
              source={require("@/assets/images/splash-icon-mine-trans.png")}
              style={styles.brandMark}
              contentFit="contain"
            />
            <View>
              <Text style={styles.brandName}>{APP_NAME}</Text>
              <Text style={styles.brandTagline}>send a hug, share love!</Text>
            </View>
          </View>

          {/* Hero — the animated version of the same drawing as the app icon. */}
          <View style={styles.hero}>
            <Logo size="m" />
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>
              {isExistingUser ? "Welcome back." : "a hug,"}
              {!isExistingUser && "\n"}
              {!isExistingUser && (
                <Text style={styles.titleAccent}>to your friends.</Text>
              )}
            </Text>
            <Text style={styles.subtitle}>
              {isExistingUser
                ? "sign in to secure your account and access it on your device."
                : "send a hug one to someone. add postcard if you like, or a note."}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <PlushButton
              label={"Continue with Google"}
              icon={
                <AntDesign name="google" size={18} color={colors.surface} />
              }
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              fullWidth
            />

            {Platform.OS === "ios" && (
              /* Apple forbids restyling the button itself, so the plush
                 underside is a sibling underneath it, never a change to it. */
              <View style={styles.applePlush}>
                <View style={styles.appleUnderside} />
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                  }
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle
                      .WHITE_OUTLINE
                  }
                  cornerRadius={radius.button}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              </View>
            )}

            {__DEV__ && (
              <PlushButton
                label={"dev: Skip Sign-In"}
                onPress={() => signInAnonymously(auth)}
                disabled={isLoading}
                variant="soft"
                fullWidth
              />
            )}
          </View>

          <Text style={styles.legal}>
            by continuing you agree to our{" "}
            <Text
              style={styles.legalLink}
              onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}
            >
              terms
            </Text>{" "}
            and{" "}
            <Text
              style={styles.legalLink}
              onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
            >
              privacy policy
            </Text>
            .
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mistBg,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandMark: {
    width: 44,
    height: 48,
  },
  brandName: {
    fontFamily: font.displayBold,
    fontSize: 30,
    color: colors.plumInk,
    lineHeight: 34,
  },
  brandTagline: {
    fontFamily: font.ui,
    fontSize: 12,
    color: colors.primary,
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontFamily: font.displayBold,
    fontSize: 30,
    lineHeight: 38,
    textAlign: "center",
    color: colors.plumInk,
  },
  titleAccent: {
    color: colors.primary,
  },
  subtitle: {
    fontFamily: font.ui,
    fontSize: 15,
    lineHeight: 21,
    color: colors.softInk,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  buttonContainer: {
    alignSelf: "stretch",
    gap: 12,
  },
  /* PlushButton draws a 52pt face over a 5pt underside; matching those
     numbers is what keeps the two buttons the same size. */
  applePlush: {
    height: BUTTON_HEIGHT + BUTTON_DEPTH,
    alignSelf: "stretch",
  },
  appleUnderside: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BUTTON_HEIGHT,
    borderRadius: radius.button,
    backgroundColor: colors.lilac,
    shadowColor: colors.lilac,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  appleButton: {
    width: "100%",
    height: BUTTON_HEIGHT,
  },
  legal: {
    fontFamily: font.ui,
    fontSize: 12,
    lineHeight: 17,
    color: colors.softInk,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  legalLink: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
});
