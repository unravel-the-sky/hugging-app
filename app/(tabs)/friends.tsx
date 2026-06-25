import { IconButton, iconButtonTint } from "@/components/ui/squish";
import { FriendAvatar } from "@/components/ui/squish/FriendAvatar";
import useCreateHugWithNote from "@/hooks/useCreateHugWithNote";
import { Friend, useFriends } from "@/hooks/useFriends";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
} from "../../components/ui/squish/theme";
import { PlushButton } from "@/components/ui/squish/PlushButton";

const lastHugLabel = (friend: Friend): string => {
  if (!friend.lastHugAt) return "no hugs yet";

  const mins = Math.floor(
    (Date.now() - friend.lastHugAt.toDate().getTime()) / 60000,
  );

  if (mins < 1) return "hugged just now";
  if (mins < 60) return `hugged ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hugged ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "hugged yesterday";
  return `hugged ${days}d ago`;
};

const FriendRow = ({
  friend,
  isFirst,
  isLast,
  onHug,
}: {
  friend: Friend;
  isFirst: boolean;
  isLast: boolean;
  onHug?: () => void;
}) => (
  <View
    style={[
      styles.cardItem,
      isFirst && styles.cardItemFirst,
      isLast && styles.cardItemLast,
    ]}
  >
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <FriendAvatar name={friend.displayName} online={friend.online} />

      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {friend.displayName}
        </Text>
        {/* <Text style={styles.subText} numberOfLines={1}>
          {lastHugLabel(friend)}
        </Text> */}
      </View>
      <PlushButton label="hug!" variant="primary" height={40} onPress={onHug} />
    </View>
  </View>
);

export default function FriendsListScreen() {
  const [search, setSearch] = useState("");
  const { startHugWithNote } = useCreateHugWithNote();
  const { friends, isLoading } = useFriends();

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return q
      ? friends.filter((f) => f.displayName.toLowerCase().includes(q))
      : friends;
  }, [friends, search]);

  const handleHug = (friend: Friend) =>
    startHugWithNote({ displayName: friend.displayName, uid: friend.uid });

  const handleAdd = () => router.push("/add-user");

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

      <Text style={styles.sectionTitle}>FRIENDS</Text>

      <FlatList
        data={filtered}
        keyExtractor={(f) => f.uid}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <FriendRow
            friend={item}
            isFirst={index === 0}
            isLast={index === filtered.length - 1}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mistBg },
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
    paddingHorizontal: spacing.lg,
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
});
