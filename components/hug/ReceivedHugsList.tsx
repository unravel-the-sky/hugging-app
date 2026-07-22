import { spacing } from "@/components/ui/squish/theme";
import { Hug } from "@/lib/handleHugs";
import { TOP_HUGGER } from "@/lib/hugs/features";
import {
  groupByPerson,
  PersonGroup,
  pinTopHugger,
  topHuggerUid,
} from "@/lib/hugs/groups";
import { byNewest } from "@/lib/hugs/time";
import React, { useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { NewHugRow, SectionHeader } from "./HugListComponents";
import { HugsEmptyState } from "./HugsEmptyState";
import { PersonGroupCard } from "./PersonGroupCard";
import { RowCard } from "./HugRowCard";

export const ReceivedHugsList = ({
  hugs,
  onSelectHug,
}: {
  hugs: Hug[];
  onSelectHug: (hug: Hug) => void;
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const listRef = useRef<FlatList<PersonGroup>>(null);

  const newHugs = useMemo(
    () => hugs.filter((hug) => !hug.seenAt).sort(byNewest),
    [hugs],
  );

  const groups = useMemo(() => {
    const seen = hugs.filter((hug) => !!hug.seenAt);
    const byPerson = groupByPerson(seen, "incoming");
    if (!TOP_HUGGER.enabled) return byPerson;
    return pinTopHugger(byPerson, topHuggerUid(byPerson, TOP_HUGGER.minHugs));
  }, [hugs]);

  const topUid = useMemo(
    () =>
      TOP_HUGGER.enabled ? topHuggerUid(groups, TOP_HUGGER.minHugs) : null,
    [groups],
  );

  const toggle = (uid: string, index: number) => {
    const willExpand = !expanded.has(uid);

    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

    if (willExpand) {
      listRef.current?.scrollToIndex({
        index,
        viewPosition: 0,
        viewOffset: spacing.md,
        animated: true,
      });
    }
  };

  return (
    <FlatList
      ref={listRef}
      data={groups}
      keyExtractor={(group) => group.uid}
      extraData={expanded}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View>
          {newHugs.length > 0 && (
            <>
              <SectionHeader title="New hugs" count={newHugs.length} />
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
            </>
          )}

          {groups.length > 0 && <SectionHeader title="Already seen" />}
        </View>
      }
      renderItem={({ item, index }) => (
        <PersonGroupCard
          group={item}
          direction="incoming"
          isTop={item.uid === topUid}
          expanded={expanded.has(item.uid)}
          onToggle={() => toggle(item.uid, index)}
          onSelectHug={onSelectHug}
        />
      )}
      ListEmptyComponent={
        newHugs.length > 0 ? null : (
          <HugsEmptyState
            title="No hugs yet"
            hint="They'll show up here the moment someone sends one."
          />
        )
      }
      onScrollToIndexFailed={({ index }) => {
        setTimeout(() => {
          listRef.current?.scrollToIndex({
            index,
            viewPosition: 0,
            animated: true,
          });
        }, 50);
      }}
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
