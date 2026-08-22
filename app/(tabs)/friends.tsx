import { IconButton, iconButtonTint, ListRow } from "@/components/ui/squish";
import { FriendAvatar } from "@/components/ui/squish/FriendAvatar";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import useCreateHugWithNote from "@/hooks/useCreateHugWithNote";
import { useFriends } from "@/hooks/useFriends";
import { useTopHugger } from "@/hooks/useIncomingHugs";
import {
  FriendshipRequest,
  onAccept,
  onDecline,
  UserFriend,
} from "@/lib/handleFriends";
import { relTime } from "@/lib/hugs/time";
import {
  ResolvedStreak,
  resolveStreak,
  streakTimeLeft,
} from "@/lib/hugs/streaks";
import { StreakFlame } from "@/components/friend/StreakFlame";
import { Ionicons } from "@expo/vector-icons";
import { Timestamp } from "firebase/firestore";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList } from "react-native-gesture-handler";
import {
  colors,
  font,
  radius,
  shadow,
  spacing,
  tint,
} from "../../components/ui/squish/theme";
import { useAvatarThumb } from "@/hooks/useAvatarThumbnail";

const millis = (ts?: Timestamp | null) => ts?.toDate().getTime() ?? 0;

/**
 * The most recent hug either way. The row used to read `lastSentHug` alone,
 * so a friend who hugs you constantly but never gets one back looked cold and
 * sank to the bottom of the list.
 */
const lastInteraction = (
  friend: UserFriend,
): { ms: number; direction: "sent" | "received" } => {
  const sent = millis(friend.lastSentHug);
  const received = millis(friend.lastReceivedHug);
  return received > sent
    ? { ms: received, direction: "received" }
    : { ms: sent, direction: "sent" };
};

const lastHugLabel = (friend: UserFriend): string => {
  const { ms, direction } = lastInteraction(friend);
  if (!ms) return "no hugs yet";
  return direction === "received"
    ? `hugged you ${relTime(ms)}`
    : `hugged ${relTime(ms)}`;
};

/**
 * What the row says instead of "hugged 3h ago" while a streak is running.
 * Only speaks up when it has something actionable — the streak is about to
 * lapse, or it is this friend's turn — so a healthy streak leaves the usual
 * last-hug line alone and the flame carries it.
 */
const streakLabel = (streak: ResolvedStreak): string | null => {
  if (!streak.days) return null;
  if (streak.isExpiring && streak.expiresAt)
    return `streak ends soon — ${streakTimeLeft(streak.expiresAt)}`;
  if (streak.waitingOn === "me" || streak.waitingOn === "both")
    return "your turn to keep the streak";
  return null;
};

const TopHuggerBadge = () => (
  <View style={styles.topBadge}>
    <Text style={styles.topBadgeText}>TOP HUGGER</Text>
  </View>
);

export const FriendRow = ({
  friend,
  isFirst,
  isLast,
  isTop,
  onHug,
}: {
  friend: UserFriend;
  isFirst: boolean;
  isLast: boolean;
  isTop: boolean;
  onHug?: () => void;
}) => {
  const photoUri = useAvatarThumb(friend.id);
  const streak = resolveStreak(friend);

  return (
    <ListRow
      isFirst={isFirst}
      isLast={isLast}
      standalone={isTop}
      style={isTop ? styles.cardItemTop : undefined}
      onPress={() => {
        router.push({
          pathname: "/friend-memory-lane",
          params: { friendId: friend.id },
        });
      }}
    >
      <FriendAvatar
        name={friend.displayName}
        online={friend.online}
        photoUri={photoUri ?? undefined}
      />

      <View style={styles.rowBody}>
        <View style={styles.nameRow}>
          {isTop && <TopHuggerBadge />}
          <Text style={styles.name} numberOfLines={1}>
            {friend.displayName}
          </Text>
          <StreakFlame streak={streak} />
        </View>
        <Text style={styles.subText} numberOfLines={1}>
          {streakLabel(streak) ?? lastHugLabel(friend)}
        </Text>
      </View>
      <PlushButton label="hug!" variant="primary" height={40} onPress={onHug} />
    </ListRow>
  );
};

const FriendRequestRow = ({
  friendRequest,
  isFirst,
  isLast,
  isBusy,
  onAccept,
  onDecline,
}: {
  friendRequest: FriendshipRequest;
  isFirst: boolean;
  isLast: boolean;
  isBusy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) => {
  const photoUri = useAvatarThumb(friendRequest.from);

  return (
    <ListRow isFirst={isFirst} isLast={isLast}>
      <FriendAvatar
        name={friendRequest.fromName}
        photoUri={photoUri || undefined}
      />

      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {friendRequest.fromName}
        </Text>
      </View>

      <View style={styles.requestActions}>
        {isBusy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <IconButton
              variant="surface"
              size={44}
              accessibilityLabel="decline friend"
              icon={<Ionicons name="close-outline" size={24} />}
              onPress={onDecline}
            />
            <IconButton
              variant="primary"
              onPress={onAccept}
              size={44}
              accessibilityLabel="accept friend"
              icon={
                <Ionicons name="checkmark-outline" color={"white"} size={24} />
              }
            />
          </>
        )}
      </View>
    </ListRow>
  );
};

export default function FriendsListScreen() {
  const [search, setSearch] = useState("");
  const { startHugWithNote } = useCreateHugWithNote();

  const { friends, friendRequests, isLoading } = useFriends();

  const { topHuggerUid } = useTopHugger();

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    const base = q
      ? friends.filter((f) => f.displayName.toLowerCase().includes(q))
      : friends;

    const lastHugTime = (f: UserFriend) => {
      const { ms } = lastInteraction(f);
      return ms || -Infinity; // never hugged sorts below everyone
    };

    return [...base].sort((a, b) => {
      if (topHuggerUid) {
        if (a.id === topHuggerUid) return -1;
        if (b.id === topHuggerUid) return 1;
      }
      return lastHugTime(b) - lastHugTime(a); // most recent first
    });
  }, [friends, search, topHuggerUid]);

  // the top hugger renders as its own standalone card, so the merged group
  // starts one row later when they're sorted to the front
  const groupStart = filtered[0]?.id === topHuggerUid ? 1 : 0;

  const handleHug = (friend: UserFriend) =>
    startHugWithNote({ displayName: friend.displayName, uid: friend.id });

  const handleAdd = () => router.push("/add-user");

  const [showFriendshipRequests, setShowFriendshipRequests] = useState(true);

  // accept/decline round-trip through a cloud function, which can take a few
  // seconds on a cold start — show the row as busy until the listener catches up
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const handleRequest = async (
    id: string,
    action: (id: string) => Promise<void>,
  ) => {
    setBusyRequestId(id);
    try {
      await action(id);
    } finally {
      setBusyRequestId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Friends</Text>
          <Text style={styles.headerCount}>{friends.length}</Text>
        </View>

        <IconButton
          variant="surface"
          size={44}
          onPress={handleAdd}
          accessibilityLabel="add friend"
          icon={
            <Ionicons name="add" size={24} color={iconButtonTint("surface")} />
          }
        />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.softInk} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people"
          placeholderTextColor={colors.softInk}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {friendRequests.length > 0 && (
        <View>
          <Pressable
            onPress={() => setShowFriendshipRequests(!showFriendshipRequests)}
            style={{
              display: "flex",
              flexDirection: "row",
              width: "80%",
            }}
          >
            <Text style={styles.sectionTitle}>FRIENDSHIP REQUESTS</Text>
            <Text style={styles.friendsCount}>{friendRequests.length}</Text>
          </Pressable>

          {showFriendshipRequests && (
            <FlatList
              data={friendRequests}
              keyExtractor={(f) => f.id}
              contentContainerStyle={styles.listContentRequests}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <FriendRequestRow
                  friendRequest={item}
                  isFirst={index === 0}
                  isLast={index === friendRequests.length - 1}
                  isBusy={busyRequestId === item.id}
                  onAccept={() => handleRequest(item.id, onAccept)}
                  onDecline={() => handleRequest(item.id, onDecline)}
                />
              )}
            />
          )}
        </View>
      )}

      <View style={{ flex: 1 }}>
        <FlatList
          data={filtered}
          keyExtractor={(f) => f.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <FriendRow
              friend={item}
              isFirst={index === groupStart}
              isLast={index === filtered.length - 1}
              isTop={item.id === topHuggerUid}
              onHug={() => handleHug(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {search ? "no matches.." : "no friends, yet!"}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.soft,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.mistBg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  headerTitle: {
    fontFamily: font.displayBold,
    fontSize: 34,
    color: colors.plumInk,
  },
  headerCount: { fontFamily: font.ui, fontSize: 18, color: colors.softInk },
  friendsCount: { fontFamily: font.ui, fontSize: 14, color: colors.softInk },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    height: 52,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    ...shadow,
    shadowOpacity: 0.12,
  },
  searchInput: {
    flex: 1,
    fontFamily: font.ui,
    fontSize: 16,
    color: colors.plumInk,
  },

  sectionTitle: {
    fontFamily: font.uiBold,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.softInk,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },

  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  listContentRequests: { paddingHorizontal: spacing.xl, paddingBottom: 20 },

  rowBody: { flex: 1, marginLeft: spacing.md },
  requestActions: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  name: { fontFamily: font.uiBold, fontSize: 16, color: colors.plumInk },
  subText: {
    fontFamily: font.ui,
    fontSize: 14,
    color: colors.softInk,
    marginTop: 2,
  },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: {
    fontFamily: font.displayBold,
    fontSize: 22,
    color: colors.plumInk,
  },

  // top hugger greieieieiei — ListRow's `standalone` handles the corners
  cardItemTop: {
    backgroundColor: tint(colors.butter, 0.65),
    borderWidth: 1,
    borderColor: colors.butter,
  },
  nameRow: { gap: spacing.xs },
  topBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.butter,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  topBadgeText: {
    fontFamily: font.uiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.plumInk,
  },
});
