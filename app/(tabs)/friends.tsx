import { IconButton, iconButtonTint } from "@/components/ui/squish";
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
import { Ionicons } from "@expo/vector-icons";
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

const lastHugLabel = (friend: UserFriend): string => {
  if (!friend.lastSentHug) return "no hugs yet";

  const mins = Math.floor(
    (Date.now() - friend.lastSentHug.toDate().getTime()) / 60000,
  );

  if (mins < 1) return "hugged just now";
  if (mins < 60) return `hugged ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hugged ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "hugged yesterday";
  return `hugged ${days}d ago`;
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

  return (
    <Pressable
      onPress={() => {
        router.push({
          pathname: "/friend-memory-lane",
          params: { friendId: friend.id },
        });
      }}
    >
      <View
        style={[
          styles.cardItem,
          isFirst && !isTop && styles.cardItemFirst,
          isLast && styles.cardItemLast,
          isTop && styles.cardItemTop,
        ]}
      >
        <View style={[styles.row, !isLast && styles.rowDivider]}>
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
            </View>
            <Text style={styles.subText} numberOfLines={1}>
              {lastHugLabel(friend)}
            </Text>
          </View>
          <PlushButton
            label="hug!"
            variant="primary"
            height={40}
            onPress={onHug}
          />
        </View>
      </View>
    </Pressable>
  );
};

const FriendRequestRow = ({
  friendRequest,
  isFirst,
  isLast,
  onAccept,
  onDecline,
}: {
  friendRequest: FriendshipRequest;
  isFirst: boolean;
  isLast: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) => {
  const photoUri = useAvatarThumb(friendRequest.from);

  return (
    <View
      style={[
        styles.cardItem,
        isFirst && styles.cardItemFirst,
        isLast && styles.cardItemLast,
      ]}
    >
      <View style={[styles.row, !isLast && styles.rowDivider]}>
        <FriendAvatar
          name={friendRequest.fromName}
          photoUri={photoUri || undefined}
        />

        <View style={styles.rowBody}>
          <Text style={styles.name} numberOfLines={1}>
            {friendRequest.fromName}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
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
        </View>
      </View>
    </View>
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

    if (!topHuggerUid) return base;
    return [...base].sort((a, b) => {
      if (a.id === topHuggerUid) return -1;
      if (b.id === topHuggerUid) return 1;
      return 0;
    });
  }, [friends, search, topHuggerUid]);

  const handleHug = (friend: UserFriend) =>
    startHugWithNote({ displayName: friend.displayName, uid: friend.id });

  const handleAdd = () => router.push("/add-user");

  const [showFriendshipRequests, setShowFriendshipRequests] = useState(true);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
                  isLast={index === filtered.length - 1}
                  onAccept={() => onAccept(item.id)}
                  onDecline={() => onDecline(item.id)}
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
              isFirst={index === 1}
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
    </View>
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

  // these mirror hugs.tsx — see note below about extracting them
  cardItem: { backgroundColor: colors.surface, overflow: "hidden" },
  cardItemFirst: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...shadow,
  },
  cardItemLast: {
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    ...shadow,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.soft,
  },
  rowBody: { flex: 1, marginLeft: spacing.md },
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

  // top hugger greieieieiei
  cardItemTop: {
    backgroundColor: tint(colors.butter, 0.65),
    borderWidth: 1,
    borderColor: colors.butter,
    borderRadius: radius.lg, // stands alone visually even mid-list
    // borderTopRightRadius: radius.lg, // stands alone visually even mid-list
    marginBottom: 12,
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
