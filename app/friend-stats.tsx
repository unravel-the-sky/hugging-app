import {
  colors,
  darken,
  font,
  radius,
  shadow,
  spacing,
  tint,
} from "@/components/ui/squish";
import { FriendAvatar } from "@/components/ui/squish/FriendAvatar";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { useAvatarThumb } from "@/hooks/useAvatarThumbnail";
import { auth, db } from "@/lib/firebaseConfig";
import { onRemoveFriend, UserFriend } from "@/lib/handleFriends";
import { formatTimestamp } from "@/lib/util";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

const showStreak = false;
const showDeleteHistory = false;

type RemoveState = "idle" | "confirming" | "removing" | "done" | "error";

export default function FriendStatsModal() {
  const { friendId } = useLocalSearchParams<{
    friendId: string;
  }>();

  const [friend, setFriend] = useState<UserFriend | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [removeState, setRemoveState] = useState<RemoveState>("idle");
  const [deleteHistory, setDeleteHistory] = useState(false);

  useEffect(() => {
    const me = auth.currentUser;
    if (!me) return;

    // viewer's own subcollection -> numbers are from MY perspective
    const ref = doc(db, "users", me.uid, "friends", friendId);

    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          setFriend(snap.data() as UserFriend);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [friendId]);

  const handleRemoveFriend = async () => {
    if (!friend) return;
    setRemoveState("removing");
    try {
      await onRemoveFriend(friendId, deleteHistory);
      setRemoveState("done");
    } catch {
      setRemoveState("error");
    }
  };

  const photoUri = useAvatarThumb(friendId);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (notFound || !friend) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Could not load this friend..</Text>
      </View>
    );
  }

  const sent = friend.totalHugsSent ?? 0;
  const received = friend.totalHugsReceived ?? 0;
  const together = sent + received;
  const streak = friend.numStreakDays ?? 0;

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* identity */}
        <View style={styles.identity}>
          {/* <AvatarImage avatar={friend.avatar || "male"} size="m" /> */}
          <FriendAvatar
            name={friend.displayName}
            photoUri={photoUri ?? undefined}
          />
          <Text style={styles.name}>{friend.displayName}</Text>
        </View>

        {/* relationship total */}
        <View style={styles.totalCard}>
          <View style={styles.totalIcon}>
            <Ionicons name="heart" size={24} color={colors.blush} />
          </View>
          <View style={styles.totalTextWrap}>
            <View style={styles.totalRow}>
              <Text style={styles.totalNumber}>{together}</Text>
              <Text style={styles.totalLabel}>hugs together</Text>
            </View>
            <Text style={styles.totalSub}>since you became friends</Text>
          </View>
        </View>

        {/* memory laneee */}
        <PlushButton
          icon={<Ionicons name="star-sharp" size={20} color={colors.blush} />}
          label="memories"
          variant="soft"
          onPress={() =>
            router.push({
              pathname: "/friend-memory-lane",
              params: { friendId },
            })
          }
        />

        {/* directional split */}
        <View style={styles.splitRow}>
          <View style={styles.splitCard}>
            <View style={[styles.splitIcon, { backgroundColor: colors.soft }]}>
              <Ionicons name="paper-plane" size={20} color={colors.primary} />
            </View>
            <Text style={styles.splitNumber}>{sent}</Text>
            <Text style={styles.splitLabel}>Hugs you sent</Text>
          </View>

          <View style={styles.splitCard}>
            <View
              style={[
                styles.splitIcon,
                { backgroundColor: tint(colors.blush, 0.85) },
              ]}
            >
              <Ionicons name="gift" size={20} color={colors.blush} />
            </View>
            <Text style={styles.splitNumber}>{received}</Text>
            <Text style={styles.splitLabel}>Hugs you got back</Text>
          </View>
        </View>

        {/* streak */}
        {showStreak && (
          <View style={styles.streakCard}>
            <View style={styles.streakIcon}>
              <Ionicons name="sparkles" size={20} color={colors.butter} />
            </View>
            <View>
              <Text style={styles.streakNumber}>{streak}-day streak</Text>
              <Text style={styles.streakSub}>
                {streak > 0 ? "hugged every day" : "no streak yet"}
              </Text>
            </View>
          </View>
        )}

        {/* timestamp rows */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.infoLabel}>last hug you sent</Text>
            <Text style={styles.infoValue}>
              {friend.lastSentHug
                ? formatTimestamp(friend.lastSentHug.toDate())
                : "—"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="people-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <Text style={styles.infoLabel}>huggers since</Text>
            <Text style={styles.infoValue}>
              {friend.friendedAt
                ? formatTimestamp(friend.friendedAt.toDate())
                : "—"}
            </Text>
          </View>
        </View>

        {/* remove friend */}
        <View style={styles.removeWrap}>
          <PlushButton
            label="remove friend"
            variant={"blush"}
            onPress={() => setRemoveState("confirming")}
          />
        </View>
      </ScrollView>

      {/* confirm / progress / success modal */}
      <Modal
        visible={removeState !== "idle"}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (removeState === "confirming") setRemoveState("idle");
        }}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {removeState === "done" ? (
              <>
                <View style={styles.doneIcon}>
                  <Ionicons
                    name="checkmark-circle"
                    size={48}
                    color={colors.mint}
                  />
                </View>
                <Text style={styles.sheetTitle}>Removed</Text>
                <Text style={styles.sheetBody}>
                  {friend.displayName} is no longer in your huggers.
                </Text>
                <PlushButton
                  label="Done"
                  variant="primary"
                  fullWidth
                  onPress={() => router.back()}
                />
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Remove friend?</Text>
                <Text style={styles.sheetBody}>
                  Are you sure you want to remove {friend.displayName} from your
                  huggers?
                </Text>

                {showDeleteHistory && (
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleText}>
                      <Text style={styles.toggleLabel}>
                        Also delete history
                      </Text>
                      <Text style={styles.toggleSub}>
                        Permanently removes the hugs you exchanged
                      </Text>
                    </View>
                    <Switch
                      value={deleteHistory}
                      onValueChange={setDeleteHistory}
                      disabled={removeState === "removing"}
                      trackColor={{ false: colors.soft, true: colors.blush }}
                      thumbColor={colors.surface}
                    />
                  </View>
                )}

                {removeState === "error" && (
                  <Text style={styles.errorText}>
                    Something went wrong. Please try again.
                  </Text>
                )}

                <View style={styles.actions}>
                  <PlushButton
                    label="cancel"
                    variant="soft"
                    onPress={() => {
                      setRemoveState("idle");
                      setDeleteHistory(false);
                    }}
                    disabled={removeState === "removing"}
                    style={styles.actionBtn}
                  />
                  <PlushButton
                    label={removeState === "removing" ? "removing…" : "remove"}
                    variant="blush"
                    onPress={handleRemoveFriend}
                    disabled={removeState === "removing"}
                    style={styles.actionBtn}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.mistBg },
  container: {
    padding: spacing.xl,
    paddingBottom: spacing.xl * 1.6,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mistBg,
    padding: spacing.xl,
  },
  emptyText: { color: colors.softInk, fontSize: 16, fontFamily: font.ui },

  identity: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  name: { fontSize: 30, fontFamily: font.displayBold, color: colors.plumInk },

  totalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.soft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  totalIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  totalTextWrap: { flex: 1, gap: 2 },
  totalRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  totalNumber: {
    fontSize: 30,
    fontFamily: font.displayBold,
    color: colors.plumInk,
  },
  totalLabel: { fontSize: 16, fontFamily: font.uiBold, color: colors.primary },
  totalSub: { fontSize: 14, fontFamily: font.ui, color: colors.softInk },

  splitRow: { flexDirection: "row", gap: spacing.lg },
  splitCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  splitIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  splitNumber: {
    fontSize: 32,
    fontFamily: font.displayBold,
    color: colors.plumInk,
  },
  splitLabel: { fontSize: 14, fontFamily: font.ui, color: colors.softInk },

  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tint(colors.butter, 0.82),
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  streakNumber: {
    fontSize: 19,
    fontFamily: font.displayBold,
    color: darken(colors.butter, 0.42),
  },
  streakSub: {
    fontSize: 14,
    fontFamily: font.ui,
    color: darken(colors.butter, 0.28),
  },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    ...shadow,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: font.ui,
    color: colors.plumInk,
  },
  removeWrap: {},
  infoValue: { fontSize: 15, fontFamily: font.uiBold, color: colors.plumInk },
  divider: { height: 1, backgroundColor: colors.mistBg },
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.mistBg,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 15, fontFamily: font.uiBold, color: colors.plumInk },
  toggleSub: { fontSize: 13, fontFamily: font.ui, color: colors.softInk },
  errorText: {
    fontSize: 14,
    fontFamily: font.ui,
    color: colors.blush,
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: spacing.md },
  actionBtn: { flex: 1 },
  doneIcon: { alignItems: "center" },
});
