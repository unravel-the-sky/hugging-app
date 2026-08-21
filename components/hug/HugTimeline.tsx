import { colors, spacing } from "@/components/ui/squish/theme";
import { Hug } from "@/lib/handleHugs";
import { DayGroup, Direction, groupByDay } from "@/lib/hugs/groups";
import { useScrollToTop } from "@react-navigation/native";
import React, { useMemo, useRef } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { ListRowGroup } from "../ui/squish/ListRow";
import { PlushButton } from "../ui/squish/PlushButton";
import { DayHeader, TimelineHugRow } from "./HugListComponents";
import { HugsEmptyState } from "./HugsEmptyState";
import { HugFilter, useAllHugs } from "@/hooks/useAllHugs";
import { useCollapsibleDays } from "@/hooks/useCollapsibleDays";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const EMPTY: Record<HugFilter, { title: string; hint: string }> = {
  all: { title: "No hugs yet", hint: "Send one and it'll show up here." },
  received: {
    title: "No hugs yet",
    hint: "They'll show up the moment someone sends one.",
  },
  sent: { title: "No hugs sent yet", hint: "Pick a friend and squeeze." },
  pending: {
    title: "Nothing pending",
    hint: "Every hug you've sent has been opened.",
  },
};

export const HugTimeline = ({
  filter,
  onSelectHug,
  listHeader,
}: {
  filter: HugFilter;
  onSelectHug: (hug: Hug, direction: Direction) => void;
  /**
   * Rendered above the first day and pinned to the top once it gets there.
   * Lives inside the list (rather than above it) because only a scroll view's
   * own children can be sticky.
   */
  listHeader?: React.ReactElement;
}) => {
  const { hugs, directions, isLoading, hasMore, loadMore, isLoadingMore } =
    useAllHugs(filter);

  const days = useMemo(() => groupByDay(hugs), [hugs]);
  const { isExpanded, toggle, overrides } = useCollapsibleDays(days);
  const { user } = useCurrentUser();

  const listRef = useRef<FlatList<DayGroup>>(null);
  useScrollToTop(listRef);

  const renderDay = ({ item }: { item: DayGroup }) => {
    // `data` is empty until the user is loaded, so this is belt and braces
    if (!user) return null;

    const expanded = isExpanded(item);
    return (
      <View>
        <DayHeader title={item.title} />
        {expanded && (
          <ListRowGroup>
            {item.hugs.map((hug, i) => {
              const direction = directions.get(hug.id) ?? "incoming";
              return (
                <TimelineHugRow
                  key={hug.id}
                  hug={hug}
                  userId={user.uid}
                  direction={direction}
                  showDivider={i < item.hugs.length - 1}
                  onPress={() => onSelectHug(hug, direction)}
                />
              );
            })}
          </ListRowGroup>
        )}
      </View>
    );
  };

  const loading = isLoading || !user;

  return (
    <FlatList
      ref={listRef}
      data={loading ? [] : days}
      keyExtractor={(day) => day.key}
      renderItem={renderDay}
      showsVerticalScrollIndicator={false}
      // the screen already sits inside a SafeAreaView, so letting iOS add its
      // own inset on top would double up
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={styles.content}
      ListHeaderComponent={listHeader}
      stickyHeaderIndices={listHeader ? [0] : undefined}
      ListEmptyComponent={
        loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <HugsEmptyState {...EMPTY[filter]} />
        )
      }
      ListFooterComponent={
        hasMore && !loading ? (
          <PlushButton
            onPress={loadMore}
            disabled={isLoadingMore}
            label={isLoadingMore ? "fetching.." : "load more hugs"}
            variant="blush"
          />
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingBottom: 120, flexGrow: 1 },
  container: { flex: 1, backgroundColor: colors.soft },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
