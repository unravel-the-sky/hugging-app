import { colors, spacing } from "@/components/ui/squish/theme";
import { Hug } from "@/lib/handleHugs";
import { DayGroup, Direction, groupByDay } from "@/lib/hugs/groups";
import { useScrollToTop } from "@react-navigation/native";
import React, { useMemo, useRef } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { PlushButton } from "../ui/squish/PlushButton";
import { DayHeader, TimelineHugRow } from "./HugListComponents";
import { RowCard } from "./HugRowCard";
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
}: {
  filter: HugFilter;
  onSelectHug: (hug: Hug, direction: Direction) => void;
}) => {
  const { hugs, directions, isLoading, hasMore, loadMore, isLoadingMore } =
    useAllHugs(filter);

  const days = useMemo(() => groupByDay(hugs), [hugs]);
  const { isExpanded, toggle, overrides } = useCollapsibleDays(days);
  const { user } = useCurrentUser();

  // Tapping the already-active Hugs tab scrolls back to the top. NativeTabs
  // does emit `tabPress` on repeated selection, so this works on both
  // platforms; its built-in scroll-to-top effect does not, because that only
  // walks first children and the list sits below the header and filter tabs.
  const listRef = useRef<FlatList<DayGroup>>(null);
  useScrollToTop(listRef);

  if (isLoading || !user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderDay = ({ item }: { item: DayGroup }) => {
    const expanded = isExpanded(item);
    return (
      <View>
        <DayHeader title={item.title} />
        {expanded && (
          <RowCard>
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
          </RowCard>
        )}
      </View>
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={days}
      keyExtractor={(day) => day.key}
      renderItem={renderDay}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      ListEmptyComponent={<HugsEmptyState {...EMPTY[filter]} />}
      ListFooterComponent={
        hasMore ? (
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
  centered: { justifyContent: "center", alignItems: "center" },
});
