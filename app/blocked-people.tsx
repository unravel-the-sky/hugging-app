import { colors, font, radius, shadow, spacing } from "@/components/ui/squish";
import { FriendAvatar } from "@/components/ui/squish/FriendAvatar";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import RoundIconButton from "@/components/ui/squish/RountIconButton";
import { useBlocks } from "@/hooks/useBlocks";
import { unblockUser } from "@/lib/handleBlocks";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function BlockedPeopleScreen() {
  const { blocked, isLoading, refresh } = useBlocks();
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const handleUnblock = async (uid: string) => {
    setPending((p) => ({ ...p, [uid]: true }));
    try {
      await unblockUser(uid);
      await refresh();
    } catch (err) {
      console.error("unblock failed", err);
    } finally {
      setPending((p) => ({ ...p, [uid]: false }));
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <RoundIconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Blocked people</Text>
      </View>

      {isLoading && blocked.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            blocked.length > 0 ? (
              <Text style={styles.hint}>
                They can&apos;t reach you or find you in the app. Unblocking
                does not make you friends again.
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                You haven&apos;t blocked anyone.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <FriendAvatar name={item.displayName} />
              <Text style={styles.rowName} numberOfLines={1}>
                {item.displayName}
              </Text>
              <PlushButton
                label={pending[item.uid] ? "…" : "unblock"}
                variant="soft"
                height={44}
                disabled={pending[item.uid]}
                onPress={() => handleUnblock(item.uid)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mistBg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: font.displayBold,
    color: colors.plumInk,
  },

  listContent: { padding: spacing.xl, gap: spacing.md, flexGrow: 1 },
  hint: {
    fontSize: 15,
    fontFamily: font.ui,
    color: colors.softInk,
    lineHeight: 21,
    paddingBottom: spacing.sm,
  },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 16, fontFamily: font.ui, color: colors.softInk },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow,
  },
  rowName: {
    flex: 1,
    fontSize: 18,
    fontFamily: font.uiBold,
    color: colors.plumInk,
  },
});
