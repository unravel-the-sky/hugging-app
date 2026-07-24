import { colors, font, spacing } from "@/components/ui/squish";
import { useFriends } from "@/hooks/useFriends";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FriendRow } from "./(tabs)/friends";

export default function FriendsListModal({ onPress }: { onPress: () => void }) {
  const { friends, isLoading } = useFriends();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View>
      <Text>asdf asdf ads f</Text>
      <FlatList
        data={friends}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <FriendRow
            friend={item}
            isFirst={index === 1}
            isLast={index === friends.length - 1}
            isTop={false}
            onHug={() => {}}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{"no friends.."}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: {
    fontFamily: font.displayBold,
    fontSize: 22,
    color: colors.plumInk,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.mistBg,
  },
});
