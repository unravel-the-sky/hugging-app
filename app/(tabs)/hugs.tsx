import { FilterTabs, Tab } from "@/components/hug/HugListComponents";
import { HugsEmptyState } from "@/components/hug/HugsEmptyState";
import { HugTimeline } from "@/components/hug/HugTimeline";
import HugViewOverlay3d from "@/components/hug/HugViewOverlay3d";
import { colors, font, spacing } from "@/components/ui/squish/theme";
import { useBlocks } from "@/hooks/useBlocks";
import { useHugs } from "@/app/context/HugsContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useHugTotals } from "@/hooks/useIncomingHugs";
import { db } from "@/lib/firebaseConfig";
import { getHugWithId, Hug, markThreadSeen } from "@/lib/handleHugs";
import { isThreadUnread } from "@/lib/hugs/thread";
import { Direction } from "@/lib/hugs/groups";
import { useLocalSearchParams } from "expo-router";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** What the overlay is showing, and from which side. */
type Selection = { hug: Hug; direction: Direction };

export default function HugsListScreen() {
  const [tab, setTab] = useState<Tab>("all");
  const [selection, setSelection] = useState<Selection | undefined>();
  const [isFromLocalSearch, setIsFromLocalSearch] = useState(false);

  const { user, isHydrating } = useCurrentUser();
  const blockedUids = useBlocks((s) => s.blockedUids);

  // The list hands over the hug it was rendering, which is a snapshot: the
  // streams keep updating after that (a hug-back landing while the overlay is
  // open, say). Re-read the live copy by id, falling back to the handed-over
  // one for a deep-linked hug that hasn't paged into either stream.
  const incoming = useHugs("incoming");
  const outgoing = useHugs("outgoing");
  const selectedHug = useMemo(() => {
    if (!selection) return undefined;
    const { id } = selection.hug;
    return (
      incoming.hugs.find((h) => h.id === id) ??
      outgoing.hugs.find((h) => h.id === id) ??
      selection.hug
    );
  }, [selection, incoming.hugs, outgoing.hugs]);

  // deep link from a push notification always points at a received hug.
  const { hugId } = useLocalSearchParams();
  useEffect(() => {
    if (!hugId) return;

    getHugWithId(hugId as string).then((res) => {
      const hug = res;
      // an older notification can still point at a hug from someone since
      // blocked — their hugs are never opened again, deep link or not
      if (hug && !blockedUids.has(hug.from)) {
        setIsFromLocalSearch(true);
        setSelection({ hug, direction: "incoming" });
      }
    });
  }, [hugId, blockedUids]);

  const markHugSeen = async (hugId: string) => {
    try {
      await updateDoc(doc(db, "hugs", hugId), { seenAt: Timestamp.now() });
    } catch (err) {
      console.error(`Error while validating hug with id: ${hugId}`, err);
    }
  };

  /**
   * Two independent markers, and both sides can owe both: opening the hug
   * itself, and catching up on the thread. The rules take one shape per
   * write, so these stay separate calls.
   */
  const handleMarkHugSeen = async (hug: Hug) => {
    if (!user) return;

    if (hug.to === user.uid && !hug.seenAt) await markHugSeen(hug.id);

    if (isThreadUnread(hug, user.uid)) {
      try {
        await markThreadSeen(hug.id);
      } catch (err) {
        console.error(`Error while marking thread seen for ${hug.id}`, err);
      }
    }
  };

  const handleOpen = () => {
    if (selectedHug) handleMarkHugSeen(selectedHug);
  };

  const handleClose = () => {
    if (selectedHug) handleMarkHugSeen(selectedHug);
    setSelection(undefined);
  };

  const { total: totalNumHugs } = useHugTotals();

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* pinned: the list scrolls underneath it, the title stays put */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hugs</Text>
        {totalNumHugs && totalNumHugs > 0 ? (
          <View style={styles.allTime}>
            <Text style={styles.heart}>♥</Text>
            <Text style={styles.allTimeText}>{totalNumHugs} all-time</Text>
          </View>
        ) : null}
      </View>

      {totalNumHugs === 0 ? (
        <HugsEmptyState
          title="No hugs yet"
          hint="Send one and it'll show up here."
        />
      ) : (
        <>
          <HugTimeline
            filter={tab}
            listHeader={
              <View style={styles.stickyTabs}>
                <FilterTabs value={tab} onChange={setTab} />
              </View>
            }
            onSelectHug={(hug, direction) => setSelection({ hug, direction })}
          />
        </>
      )}

      {selection && selectedHug && (
        <HugViewOverlay3d
          hug={selectedHug}
          startsOpen={selection.direction === "outgoing"}
          onOpen={handleOpen}
          onClose={handleClose}
          onIgnore={() => setSelection(undefined)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.soft,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: font.displayBold,
    fontSize: 34,
    color: colors.plumInk,
  },
  // the pills carry the horizontal inset themselves so they can scroll out to
  // the edge, so the sticky band has to reach past the list's padding —
  // otherwise rows show through beside it
  stickyTabs: {
    marginHorizontal: -spacing.xl,
    paddingTop: spacing.xs,
    backgroundColor: colors.soft,
  },
  allTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  heart: {
    color: colors.blush,
    fontSize: 16,
  },
  allTimeText: {
    fontFamily: font.ui,
    fontSize: 15,
    color: colors.softInk,
  },
});
