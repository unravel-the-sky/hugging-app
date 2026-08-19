import AvatarImage from "@/components/avatar/AvatarImage";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import Loader from "@/components/ui/Loader";
import { colors, font, radius, shadow, spacing } from "@/components/ui/squish";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { StatCard, StatCardRow } from "@/components/ui/squish/StatCard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useHugDraft } from "@/hooks/useHugDraft";
import { auth } from "@/lib/firebaseConfig";
import { deleteAccountFn } from "@/lib/handleUser";
import { Ionicons } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { user, isHydrating } = useCurrentUser();

  // anonymous users have no recovery path — logging out is destructive
  const isAnonymous = auth.currentUser?.isAnonymous ?? false;

  const openAvatarSheet = () => router.push("/change-avatar");

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
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

  if (isHydrating || !user) {
    return <Loader />;
  }

  const totalSent = user.stats.hugsSent ?? 0;
  const totalReceived = user.stats.hugsReceived ?? 0;

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* identity */}
        <View style={styles.profileSection}>
          <Pressable onPress={openAvatarSheet} style={styles.avatarWrap}>
            <AvatarImage isDrawn user={user} size="l" />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={18} color={colors.surface} />
            </View>
          </Pressable>
          <Text style={styles.username}>{user?.displayName}</Text>
          <PlushButton
            label="change avatar"
            variant="soft"
            height={48}
            onPress={openAvatarSheet}
          />
        </View>

        <StatCardRow>
          <StatCard
            icon="paper-plane"
            value={totalSent}
            label="total hugs sent"
          />
          <StatCard
            tone="blush"
            icon="gift"
            value={totalReceived}
            label="total hugs received"
          />
        </StatCardRow>

        {/* pushes the account actions to the bottom, per the design */}
        <View style={styles.spacer} />

        <PlushButton
          label="blocked people"
          variant="soft"
          fullWidth
          onPress={() => router.push("/blocked-people")}
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
      </ScrollView>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mistBg },

  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: font.displayBold,
    color: colors.plumInk,
  },

  content: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: 120,
    gap: spacing.md,
  },
  spacer: { flex: 1 },

  profileSection: {
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  avatarWrap: { position: "relative" },
  cameraBadge: {
    position: "absolute",
    bottom: spacing.sm,
    right: -spacing.xs,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...shadow,
  },
  username: {
    fontSize: 24,
    fontFamily: font.displayBold,
    color: colors.plumInk,
  },

  sheetBody: {
    fontSize: 16,
    fontFamily: font.ui,
    color: colors.softInk,
    textAlign: "center",
    lineHeight: 22,
  },
});
