import {
  colors,
  darken,
  font,
  radius,
  shadow,
  spacing,
  tint,
} from "@/components/ui/squish";
import Avatar from "@/components/ui/squish/Avatar";
import { auth, db } from "@/lib/firebaseConfig";
import { UserFriend } from "@/lib/handleFriends";
import { formatTimestamp } from "@/lib/util";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const showStreak = false;

export default function FriendStatsModal() {
  const { friendId } = useLocalSearchParams<{
    friendId: string;
  }>();

  const [friend, setFriend] = useState<UserFriend | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* identity */}
      <View style={styles.identity}>
        <Avatar size={108} />
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
            <Ionicons name="people-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.infoLabel}>huggers since</Text>
          <Text style={styles.infoValue}>
            {friend.friendedAt
              ? formatTimestamp(friend.friendedAt.toDate())
              : "—"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.mistBg },
  container: {
    padding: spacing.xl,
    paddingBottom: spacing.xl * 1.6,
    gap: spacing.lg,
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
  infoValue: { fontSize: 15, fontFamily: font.uiBold, color: colors.plumInk },
  divider: { height: 1, backgroundColor: colors.mistBg },
});
