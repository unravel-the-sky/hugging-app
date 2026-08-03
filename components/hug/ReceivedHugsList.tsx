import { spacing } from "@/components/ui/squish/theme";
import { Hug } from "@/lib/handleHugs";
import { DayGroup, groupByDay } from "@/lib/hugs/groups";
import { byNewest, isRecentGroup } from "@/lib/hugs/time";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { HugRow, NewHugRow, SectionHeader } from "./HugListComponents";
import { RowCard } from "./HugRowCard";
import { HugsEmptyState } from "./HugsEmptyState";
import { useCollapsibleDays } from "@/hooks/useCollapsibleDays";

export const ReceivedHugsList = ({
  hugs,
  onSelectHug,
}: {
  hugs: Hug[];
  onSelectHug: (hug: Hug) => void;
}) => {
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
    />
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120, // clears the floating tab bar
    flexGrow: 1,
  },
});
