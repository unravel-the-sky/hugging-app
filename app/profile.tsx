import AvatarImage from "@/components/avatar/AvatarImage";
import { PlushButton } from "@/components/ui/squish/PlushButton"; // adjust if path differs
import Loader from "@/components/ui/Loader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { updateUserAvatar } from "@/lib/createUser";
import { auth } from "@/lib/firebaseConfig";
import {
  colors,
  font,
  radius,
  shadow,
  spacing,
  tint,
} from "@/components/ui/squish";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type AvatarType = "male" | "female";

interface AvatarOption {
  type: AvatarType;
  label: string;
}

const avatarOptions: AvatarOption[] = [
  { type: "male", label: "zhis" },
  { type: "female", label: "zhat" },
];

export default function ProfileScreen() {
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType>("male");
  const [isSaving, setIsSaving] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { user, isHydrating } = useCurrentUser();

  // anonymous users have no recovery path — logging out is destructive
  const isAnonymous = auth.currentUser?.isAnonymous ?? false;

  useEffect(() => {
    if (user) {
      setSelectedAvatar(user.avatar || "male");
    }
  }, [user]);

  const dirty = !!user && selectedAvatar !== (user.avatar || "male");

  const handleSaveAvatar = async () => {
    setIsSaving(true);
    try {
      await updateUserAvatar(selectedAvatar);
    } catch (error) {
      console.error("Error saving avatar:", error);
    } finally {
      setIsSaving(false);
    }
  };

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

      // the real logout: ends the Firebase session, fires onAuthStateChanged,
      // which useCurrentUser listens to -> routing updates automatically
      await signOut(auth);
      router.replace("/");
    } catch (error) {
      console.error("Error logging out:", error);
      setLoggingOut(false);
    }
  };

  if (isHydrating) {
    return <Loader />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* identity */}
        <View style={styles.profileSection}>
          <AvatarImage avatar={user?.avatar} size="l" />
          <Text style={styles.username}>{user?.displayName}</Text>
        </View>

        {/* avatar picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose your avatar</Text>
          <View style={styles.avatarGrid}>
            {avatarOptions.map((avatar) => {
              const active = selectedAvatar === avatar.type;
              return (
                <Pressable
                  key={avatar.type}
                  style={[
                    styles.avatarOption,
                    active && styles.avatarOptionSelected,
                  ]}
                  onPress={() => setSelectedAvatar(avatar.type)}
                >
                  <AvatarImage avatar={avatar.type} size="m" />
                  <Text
                    style={[
                      styles.avatarLabel,
                      active && styles.avatarLabelSelected,
                    ]}
                  >
                    {avatar.label}
                  </Text>
                  {active && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* save */}
        <PlushButton
          label={isSaving ? "saving…" : "save avatar"}
          variant="primary"
          fullWidth
          disabled={isSaving || !dirty}
          onPress={handleSaveAvatar}
        />

        {/* logout lives apart from the primary actions */}
        <View style={styles.logoutWrap}>
          <PlushButton
            label="Log out"
            variant="blush"
            fullWidth
            onPress={() => setShowLogout(true)}
          />
        </View>
      </ScrollView>

      {/* logout confirm */}
      <Modal
        visible={showLogout}
        transparent
        animationType="fade"
        onRequestClose={() => !loggingOut && setShowLogout(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Log out?</Text>

            {isAnonymous ? (
              <Text style={styles.sheetBody}>
                You are using a guest account. Logging out erases it for good —
                your hugs and friends cannot be recovered. Connect Google first
                if you want to keep them.
              </Text>
            ) : (
              <Text style={styles.sheetBody}>
                You will need to sign in again to get back to your hugs.
              </Text>
            )}

            <View style={styles.actions}>
              <PlushButton
                label="Stay"
                variant="soft"
                onPress={() => setShowLogout(false)}
                disabled={loggingOut}
                style={styles.actionBtn}
              />
              <PlushButton
                label={loggingOut ? "Logging out…" : "Log out"}
                variant="blush"
                onPress={handleLogout}
                disabled={loggingOut}
                style={styles.actionBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
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

  content: { padding: spacing.xl, gap: spacing.xl },

  profileSection: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  username: {
    fontSize: 24,
    fontFamily: font.displayBold,
    color: colors.plumInk,
  },

  section: { gap: spacing.lg },
  sectionTitle: {
    fontSize: 16,
    fontFamily: font.uiBold,
    color: colors.plumInk,
  },

  avatarGrid: { flexDirection: "row", gap: spacing.lg },
  avatarOption: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    ...shadow,
  },
  avatarOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: tint(colors.primary, 0.88),
  },
  avatarLabel: {
    fontSize: 14,
    fontFamily: font.uiBold,
    color: colors.softInk,
  },
  avatarLabelSelected: { color: colors.primary },
  selectedBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedBadgeText: {
    color: colors.surface,
    fontSize: 14,
    fontFamily: font.uiBold,
  },

  logoutWrap: { marginTop: spacing.sm },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(74, 66, 104, 0.45)",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadow,
  },
  sheetTitle: {
    fontSize: 22,
    fontFamily: font.displayBold,
    color: colors.plumInk,
    textAlign: "center",
  },
  sheetBody: {
    fontSize: 16,
    fontFamily: font.ui,
    color: colors.softInk,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: { flexDirection: "row", gap: spacing.md },
  actionBtn: { flex: 1 },
});
