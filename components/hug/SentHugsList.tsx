import { spacing } from "@/components/ui/squish/theme";
import { useCollapsibleDays } from "@/hooks/useCollapsibleDays";
import { Hug } from "@/lib/handleHugs";
import { DayGroup, groupByDay } from "@/lib/hugs/groups";
import React, { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { HugRow, SectionHeader } from "./HugListComponents";
import { HugsEmptyState } from "./HugsEmptyState";
import { RowCard } from "./HugRowCard";

export const SentHugsList = ({
  hugs,
  onSelectHug,
}: {
  hugs: Hug[];
  onSelectHug: (hug: Hug) => void;
}) => {
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
    />
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
    flexGrow: 1,
  },
});
