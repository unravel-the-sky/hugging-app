import { colors, font, radius, shadow, spacing } from "@/components/ui/squish";
import { FriendAvatar } from "@/components/ui/squish/FriendAvatar";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFriends } from "@/hooks/useFriends";
import { shareInvite } from "@/lib/invite";
import { getPendingOutgoingUids, sendFriendRequest } from "@/lib/handleFriends";
import {
  searchUsersByPrefix,
  type UserSearchResult,
} from "@/lib/searchUsersByPrefix"; // adjust path
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type SentState = Record<string, "idle" | "sending" | "sent">;

export default function AddUserScreen() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sent, setSent] = useState<SentState>({});
  const { friends } = useFriends();
  const { user } = useCurrentUser();

  // tracks the latest query so out-of-order responses get discarded
  const latestTerm = useRef("");

  useEffect(() => {
    const trimmed = term.trim();
    latestTerm.current = trimmed;

    if (trimmed.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const found = await searchUsersByPrefix(trimmed);
        // discard if the user kept typing while this was in flight
        if (latestTerm.current !== trimmed) return;

        const pending = await getPendingOutgoingUids();
        if (latestTerm.current !== trimmed) return;

        setResults(found);
        setSent((prev) => {
          const next = { ...prev };
          for (const u of found) {
            if (pending.has(u.uid)) next[u.uid] = "sent";
          }
          return next;
        });
      } catch (e) {
        if (latestTerm.current === trimmed) setResults([]);
        console.error("search failed", e);
      } finally {
        if (latestTerm.current === trimmed) setSearching(false);
      }
    }, 300); // debounce

    return () => clearTimeout(handle);
  }, [term]);

  const handleAdd = async (user: UserSearchResult) => {
    setSent((s) => ({ ...s, [user.uid]: "sending" }));
    try {
      await sendFriendRequest(user.displayName);
      setSent((s) => ({ ...s, [user.uid]: "sent" }));
    } catch (e) {
      setSent((s) => ({ ...s, [user.uid]: "idle" }));
      console.error("send request failed", e);
    }
  };

  const showEmpty =
    term.trim().length >= 3 && !searching && results.length === 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Add a friend</Text>
          {/* Username is the only way to find anyone here — search matches
              nothing else — so say so before they try their friend's name. */}
          <Text style={styles.subtitle}>
            Add your friends by their username.
          </Text>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color={colors.softInk} />
          <TextInput
            style={styles.input}
            placeholder="Search people"
            placeholderTextColor={colors.softInk}
            value={term}
            onChangeText={setTerm}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {searching && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const state = sent[item.uid] ?? "idle";
          const alreadyFriend = friends.find((f) => f.id === item.uid);
          return (
            <View style={styles.row}>
              <FriendAvatar name={item.displayName} uid={item.uid} />
              <Text style={styles.rowName} numberOfLines={1}>
                {item.displayName}
              </Text>
              {alreadyFriend ? (
                <PlushButton disabled label={"added"} variant="soft" />
              ) : (
                <Pressable
                  style={[styles.addBtn, state === "sent" && styles.addBtnSent]}
                  onPress={() => handleAdd(item)}
                  disabled={state !== "idle"}
                >
                  {state === "sending" ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text
                      style={[
                        styles.addBtnText,
                        state === "sent" && styles.addBtnTextSent,
                      ]}
                    >
                      {state === "sent" ? "sent" : "add"}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          showEmpty ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No user found</Text>
            </View>
          ) : null
        }
        // Sits below whatever the list is showing — results, "No user found",
        // or nothing typed yet. Someone who came here to add a friend and
        // can't is exactly who has a reason to send an invite.
        ListFooterComponent={
          <View style={styles.inviteFooter}>
            <Text style={styles.inviteHint}>cannot find your friend?</Text>
            <PlushButton
              label="invite a friend"
              variant="soft"
              height={44}
              onPress={() => shareInvite(user?.displayName)}
            />
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mistBg, paddingBottom: 40 },

  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  titleWrap: { gap: spacing.xs },
  title: { fontSize: 26, fontFamily: font.displayBold, color: colors.plumInk },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: font.ui,
    color: colors.softInk,
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadow,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: font.ui,
    color: colors.plumInk,
    padding: 0,
  },

  listContent: { padding: spacing.xl, gap: spacing.md },

  inviteFooter: {
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  inviteHint: {
    fontFamily: font.ui,
    fontSize: 15,
    color: colors.softInk,
  },

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

  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minWidth: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnSent: { backgroundColor: colors.soft },
  addBtnText: { fontSize: 15, fontFamily: font.uiBold, color: colors.surface },
  addBtnTextSent: { color: colors.primary },

  empty: { alignItems: "center", paddingTop: spacing.xl * 2 },
  emptyText: { fontSize: 16, fontFamily: font.ui, color: colors.softInk },
});
