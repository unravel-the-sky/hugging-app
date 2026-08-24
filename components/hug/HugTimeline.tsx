import { colors, spacing } from "@/components/ui/squish/theme";
import { Hug } from "@/lib/handleHugs";
import {
  clusterByPerson,
  DayGroup,
  Direction,
  groupByDay,
} from "@/lib/hugs/groups";
import { useScrollToTop } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { ListRowGroup } from "../ui/squish/ListRow";
import { PlushButton } from "../ui/squish/PlushButton";
import {
  DayHeader,
  PersonClusterRow,
  TimelineHugRow,
} from "./HugListComponents";
import { HugsEmptyState } from "./HugsEmptyState";
import { HugFilter, useAllHugs } from "@/hooks/useAllHugs";
import { useRefreshHugs } from "@/context/HugsContext";
import { useCollapsibleDays } from "@/hooks/useCollapsibleDays";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const EMPTY: Record<HugFilter, { title: string; hint: string }> = {
  all: { title: "No hugs yet", hint: "Send one and it'll show up here." },
  new: {
    title: "All caught up",
    hint: "Nothing new to open — hugs and hug backs land here.",
  },
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

  // Collapsed unless the user has opened this run. Keyed by day *and* person,
  // so opening yesterday's run with Ana leaves today's alone.
  const [openClusters, setOpenClusters] = useState<Record<string, boolean>>({});
  const toggleCluster = useCallback(
    (key: string) =>
      setOpenClusters((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  );

  const entriesByDay = useMemo(() => {
    const directionOf = (hug: Hug) => directions.get(hug.id) ?? "incoming";
    return new Map(
      days.map((day) => [day.key, clusterByPerson(day.hugs, directionOf)]),
    );
  }, [days, directions]);

  // `hasMore` answers "are there older *documents*", not "are there older
  // rows this filter would keep". On New that's nearly always true and
  // nearly always fruitless — every older hug has been read — so the button
  // would sit under a single unread hug forever, paging a whole history to
  // reveal nothing. Anything unread lives at the top of the window we
  // already hold, which is the same window the tab badge counts.
  const canLoadMore = hasMore && filter !== "new";
  const { isExpanded, toggle, overrides } = useCollapsibleDays(days);
  const { user } = useCurrentUser();

  const listRef = useRef<FlatList<DayGroup>>(null);
  useScrollToTop(listRef);

  const refreshHugs = useRefreshHugs();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshHugs();
    } finally {
      setRefreshing(false);
    }
  }, [refreshHugs]);

  /**
   * A day flattens to rows before it renders: a cluster contributes its own
   * row plus, when open, the run beneath it. Building the list first is what
   * lets the divider know which row actually ends the day.
   */
  const renderRows = (day: DayGroup) => {
    if (!user) return null;

    const rows: {
      key: string;
      render: (showDivider: boolean) => React.ReactNode;
    }[] = [];

    for (const entry of entriesByDay.get(day.key) ?? []) {
      if (entry.kind === "hug") {
        const { hug } = entry;
        const direction = directions.get(hug.id) ?? "incoming";
        rows.push({
          key: hug.id,
          render: (showDivider) => (
            <TimelineHugRow
              hug={hug}
              userId={user.uid}
              direction={direction}
              showDivider={showDivider}
              onPress={() => onSelectHug(hug, direction)}
            />
          ),
        });
        continue;
      }

      const clusterKey = `${day.key}:${entry.key}`;
      const open = !!openClusters[clusterKey];

      rows.push({
        key: clusterKey,
        render: (showDivider) => (
          <PersonClusterRow
            hugs={entry.hugs}
            uid={entry.uid}
            name={entry.name}
            userId={user.uid}
            expanded={open}
            showDivider={showDivider}
            onPress={() => toggleCluster(clusterKey)}
          />
        ),
      });

      if (!open) continue;

      for (const hug of entry.hugs) {
        const direction = directions.get(hug.id) ?? "incoming";
        rows.push({
          key: hug.id,
          render: (showDivider) => (
            <TimelineHugRow
              hug={hug}
              userId={user.uid}
              direction={direction}
              showDivider={showDivider}
              onPress={() => onSelectHug(hug, direction)}
            />
          ),
        });
      }
    }

    return rows.map((row, i) => (
      <React.Fragment key={row.key}>
        {row.render(i < rows.length - 1)}
      </React.Fragment>
    ));
  };

  const renderDay = ({ item }: { item: DayGroup }) => {
    // `data` is empty until the user is loaded, so this is belt and braces
    if (!user) return null;

    const expanded = isExpanded(item);
    return (
      <View>
        <DayHeader title={item.title} />
        {expanded && <ListRowGroup>{renderRows(item)}</ListRowGroup>}
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
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
        canLoadMore && !loading ? (
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
