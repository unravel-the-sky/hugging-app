import { colors, spacing } from "@/components/ui/squish/theme";
import { useCollapsibleDays } from "@/hooks/useCollapsibleDays";
import { Hug } from "@/lib/handleHugs";
import { DayGroup, groupByDay } from "@/lib/hugs/groups";
import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { HugRow, SectionHeader } from "./HugListComponents";
import { HugsEmptyState } from "./HugsEmptyState";
import { RowCard } from "./HugRowCard";
import { useHugs } from "@/hooks/useIncomingHugs";
import { PlushButton } from "../ui/squish/PlushButton";

export const SentHugsList = ({
  onSelectHug,
}: {
  onSelectHug: (hug: Hug) => void;
}) => {
  const {
    isLoading: outgoingLoading,
    hugs,
    hasMore,
    loadMore,
    isLoadingMore,
  } = useHugs("outgoing");

  const days = useMemo(() => groupByDay(hugs), [hugs]);
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
                direction="outgoing"
                showDivider={i < item.hugs.length - 1}
                onPress={() => onSelectHug(hug)}
              />
            ))}
          </RowCard>
        )}
      </View>
    );
  };

  if (outgoingLoading) {
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
      ListEmptyComponent={
        <HugsEmptyState
          title="No hugs sent yet"
          hint="Pick a friend and squeeze."
        />
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
    paddingBottom: 120,
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
