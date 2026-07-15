import { Logo } from "@/components/ui/Logo";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { auth } from "@/lib/firebaseConfig";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  GoogleAuthProvider,
  linkWithCredential,
  OAuthProvider,
  signInAnonymously,
  signInWithCredential,
} from "firebase/auth";
import React, { useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

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
        "This Google account is already linked to another Hug.me account. Please contact support.",
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
        "This Apple account is already linked to another Hug.me account. Please contact support.",
      );
      return;
    }

    console.error("Apple Sign-in error:", error);
    Alert.alert("Sign-in failed", "Something went wrong. Please try again.");
  };

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        {/* <Text style={styles.emoji}>🤗</Text> */}
        <Logo size="s" />
        <Text style={styles.title}>
          {isExistingUser ? "Welcome back" : "Hello there!"}
        </Text>
        <Text style={styles.subtitle}>
          {isExistingUser
            ? "Sign in to secure your account and access it on any device."
            : "Sign in to get started with sending hugs."}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <PlushButton
          label={"continue with google"}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        />

        {/* Apple Sign-In button slot — we'll add this in the next phase */}
        {Platform.OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={12}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}

        {__DEV__ && (
          <PlushButton
            label={"dev: Skip Sign-In"}
            onPress={() => signInAnonymously(auth)}
            disabled={isLoading}
            variant="soft"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  appleButton: {
    width: "100%",
    height: 56,
  },
  devButton: {
    marginTop: 12,
    backgroundColor: "#DDD",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#FFB3B3",
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
