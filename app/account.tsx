import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { colors, font, spacing } from "@/components/ui/squish";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { clearPushTokenOnUser } from "@/hooks/useCurrentUser";
import { useHugDraft } from "@/hooks/useHugDraft";
import { auth } from "@/lib/firebaseConfig";
import { deleteAccountFn } from "@/lib/handleUser";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * The account actions, kept off the profile screen so they cannot be tapped by
 * accident. Presented as a sheet from the root stack — see app/_layout.tsx.
 */
export default function AccountScreen() {
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // anonymous users have no recovery path — logging out is destructive
  const isAnonymous = auth.currentUser?.isAnonymous ?? false;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // stop this device receiving the next hugs sent to this account.
      // must happen while still signed in — the write needs auth.
      const uid = auth.currentUser?.uid;
      if (uid) await clearPushTokenOnUser(uid);

      // end the Google session too, so next sign-in shows the account picker
      try {
        if (GoogleSignin.hasPreviousSignIn()) {
          await GoogleSignin.signOut();
        }
      } catch {
        // not a Google user / module unavailable — fine to ignore
      }

      useHugDraft.getState().resetAll();
      await signOut(auth);
      router.replace("/");
    } catch (error) {
      console.error("Error logging out:", error);
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccountFn();
      try {
        if (GoogleSignin.hasPreviousSignIn()) await GoogleSignin.signOut();
      } catch {}
      await signOut(auth).catch(() => {});
      router.replace("/");
    } catch (e) {
      console.error("Delete failed:", e);
      setDeleting(false);
    }
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>account</Text>

      <PlushButton
        label="blocked people"
        variant="soft"
        fullWidth
        onPress={() => {
          router.back();
          router.push("/blocked-people");
        }}
      />
      <PlushButton
        label="log out"
        variant="blush"
        fullWidth
        onPress={() => setShowLogout(true)}
      />
      <PlushButton
        label="delete account"
        variant="blush"
        fullWidth
        onPress={() => setShowDelete(true)}
      />

      {/* logout confirm */}
      <ConfirmationModal
        isVisible={showLogout}
        onRequestClose={() => !loggingOut && setShowLogout(false)}
        title="Log out?"
        confirmButtonLabel={loggingOut ? "logging out…" : "log out"}
        cancelButtonLabel="stay"
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      >
        {isAnonymous ? (
          <Text style={styles.sheetBody}>
            You are using a guest account. Logging out erases it for good — your
            hugs and friends cannot be recovered. Connect Google first if you
            want to keep them.
          </Text>
        ) : (
          <Text style={styles.sheetBody}>
            You will need to sign in again to get back to your hugs.
          </Text>
        )}
      </ConfirmationModal>

      {/* delete account confirm */}
      <ConfirmationModal
        isVisible={showDelete}
        onRequestClose={() => !deleting && setShowDelete(false)}
        title="Delete account?"
        confirmButtonLabel={deleting ? "deleting…" : "delete"}
        cancelButtonLabel="stay"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDelete(false)}
      >
        {isAnonymous ? (
          <Text style={styles.sheetBody}>
            You are using a guest account. Deleting it removes your hugs and
            friends for good — they cannot be recovered.
          </Text>
        ) : (
          <Text style={styles.sheetBody}>
            So, that is it, huh? Thanks for using my app. This action is
            irreversible and will remove your user from the database, and all
            the relevant information. Thank you!
          </Text>
        )}
      </ConfirmationModal>
    </View>
  );
}

const styles = StyleSheet.create({
  // the sheet sizes itself to this content, so the padding here is what sets
  // how tall it comes up
  sheet: {
    padding: spacing.xl,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  title: {
    fontSize: 22,
    fontFamily: font.displayBold,
    color: colors.plumInk,
    textAlign: "center",
    paddingBottom: spacing.sm,
  },
  sheetBody: {
    fontSize: 16,
    fontFamily: font.ui,
    color: colors.softInk,
    textAlign: "center",
    lineHeight: 22,
  },
});
