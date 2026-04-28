import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "@/lib/auth-config";
import { auth } from "@/lib/firebaseConfig";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  GoogleAuthProvider,
  linkWithCredential,
  signInWithCredential,
} from "firebase/auth";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🤗</Text>
        <Text style={styles.title}>
          {isExistingUser ? "Welcome back" : "Welcome to Hug"}
        </Text>
        <Text style={styles.subtitle}>
          {isExistingUser
            ? "Sign in to secure your account and access it on any device."
            : "Sign in to get started with sending hugs."}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Continue with Google</Text>
          )}
        </TouchableOpacity>

        {/* Apple Sign-In button slot — we'll add this in the next phase */}
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
