import AvatarImage from "@/components/avatar/AvatarImage";
import Loader from "@/components/ui/Loader";
import { SettingToggleRow } from "@/components/ui/SettingToggleRow";
import { colors, font, radius, shadow, spacing } from "@/components/ui/squish";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { StatCard, StatCardRow } from "@/components/ui/squish/StatCard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { updateAutoSavePostcard } from "@/lib/createUser";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user, isHydrating } = useCurrentUser();
  // the user doc streams in over a snapshot, so the write is what persists —
  // this only keeps the checkbox responsive until it comes back
  const [pendingAutoSave, setPendingAutoSave] = useState<boolean>();

  const autoSavePostcard = pendingAutoSave ?? user?.autoSavePostcard ?? false;

  // once the write lands, stop overriding — otherwise a change made on another
  // device would stay masked by our stale optimistic value
  useEffect(() => {
    if (
      pendingAutoSave !== undefined &&
      user?.autoSavePostcard === pendingAutoSave
    ) {
      setPendingAutoSave(undefined);
    }
  }, [pendingAutoSave, user?.autoSavePostcard]);

  const handleAutoSaveChange = async (next: boolean) => {
    setPendingAutoSave(next);
    try {
      await updateAutoSavePostcard(next);
    } catch (err) {
      console.error("Could not save the postcard preference:", err);
      setPendingAutoSave(undefined);
    }
  };

  const openAvatarSheet = () => router.push("/change-avatar");

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

        <View style={styles.separator}>
          <View style={styles.rule} />
          <Text style={styles.separatorLabel}>settings</Text>
          <View style={styles.rule} />
        </View>

        <SettingToggleRow
          icon="save-outline"
          title="auto-save postcards"
          subtitle="keep a copy in your photos when you send"
          value={autoSavePostcard}
          onChange={handleAutoSaveChange}
        />

        <Pressable
          style={({ pressed }) => [styles.flatRow, pressed && styles.flatRowOn]}
          onPress={() => router.push("/account")}
        >
          <Text style={styles.flatRowLabel}>account</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.softInk} />
        </Pressable>
      </ScrollView>
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

  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.soft,
  },
  separatorLabel: {
    fontFamily: font.ui,
    fontSize: 12,
    color: colors.softInk,
    textTransform: "uppercase",
  },

  // deliberately flat: the plush buttons read as "act now", and this row is
  // just a door to the account actions
  flatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  flatRowOn: { backgroundColor: colors.mistBg },
  flatRowLabel: {
    fontFamily: font.uiBold,
    fontSize: 16,
    color: colors.plumInk,
  },

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
});
