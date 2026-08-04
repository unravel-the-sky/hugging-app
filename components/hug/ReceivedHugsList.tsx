import { colors, spacing } from "@/components/ui/squish/theme";
import { useCollapsibleDays } from "@/hooks/useCollapsibleDays";
import { Hug } from "@/lib/handleHugs";
import { DayGroup, groupByDay } from "@/lib/hugs/groups";
import { byNewest } from "@/lib/hugs/time";
import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { HugRow, NewHugRow, SectionHeader } from "./HugListComponents";
import { RowCard } from "./HugRowCard";
import { HugsEmptyState } from "./HugsEmptyState";
import { useHugs } from "@/hooks/useIncomingHugs";
import { PlushButton } from "../ui/squish/PlushButton";

export const ReceivedHugsList = ({
  onSelectHug,
}: {
  onSelectHug: (hug: Hug) => void;
}) => {
  const {
    isLoading: incomingLoading,
    hugs,
    hasMore,
    loadMore,
    isLoadingMore,
  } = useHugs("incoming");

  const newHugs = useMemo(
    () => hugs.filter((hug) => !hug.seenAt).sort(byNewest),
    [hugs],
  );

  const days = useMemo(
    () => groupByDay(hugs.filter((hug) => !!hug.seenAt)),
    [hugs],
  );

  const { isExpanded, toggle, overrides } = useCollapsibleDays(days);

  const renderDay = ({ item }: { item: DayGroup }) => {
    const expanded = isExpanded(item);

    return (
      <View>
        <SectionHeader
          title={item.title}
          count={expanded ? undefined : item.hugs.length}
          countTone="muted"
          collapsible
          expanded={expanded}
          onToggle={() => toggle(item)}
        />

        {expanded && (
          <RowCard>
            {item.hugs.map((hug, i) => (
              <HugRow
                key={hug.id}
                hug={hug}
                direction="incoming"
                showDivider={i < item.hugs.length - 1}
                onPress={() => onSelectHug(hug)}
              />
            ))}
          </RowCard>
        )}
      </View>
    );
  };

  if (incomingLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={days}
      keyExtractor={(day) => day.key}
      extraData={overrides}
      renderItem={renderDay}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        newHugs.length > 0 ? (
          <View>
            <SectionHeader
              title="New hugs"
              count={newHugs.length}
              countTone="unread"
            />
            <RowCard>
              {newHugs.map((hug, i) => (
                <NewHugRow
                  key={hug.id}
                  hug={hug}
                  showDivider={i < newHugs.length - 1}
                  onSee={() => onSelectHug(hug)}
                />
              ))}
            </RowCard>
          </View>
        ) : null
      }
      ListEmptyComponent={
        newHugs.length > 0 ? null : (
          <HugsEmptyState
            title="No hugs yet"
            hint="They'll show up here the moment someone sends one."
          />
        )
      }
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
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120, // clears the floating tab bar
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.soft,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
});
