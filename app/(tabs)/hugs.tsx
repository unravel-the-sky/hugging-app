import { useBlocks } from "@/app/context/BlocksContext";
import { FilterTabs, Tab } from "@/components/hug/HugListComponents";
import { HugsEmptyState } from "@/components/hug/HugsEmptyState";
import { HugTimeline } from "@/components/hug/HugTimeline";
import HugViewOverlay3d from "@/components/hug/HugViewOverlay3d";
import { colors, font, spacing } from "@/components/ui/squish/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useHugTotals } from "@/hooks/useIncomingHugs";
import { db } from "@/lib/firebaseConfig";
import { getHugWithId, Hug } from "@/lib/handleHugs";
import { Direction } from "@/lib/hugs/groups";
import { useLocalSearchParams } from "expo-router";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

/** What the overlay is showing, and from which side. */
type Selection = { hug: Hug; direction: Direction };

export default function HugsListScreen() {
  const [tab, setTab] = useState<Tab>("all");
  const [selection, setSelection] = useState<Selection | undefined>();
  const [isFromLocalSearch, setIsFromLocalSearch] = useState(false);

  const { user, isHydrating } = useCurrentUser();
  const { blockedUids } = useBlocks();

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

  const markHugBackSeen = async (hugId: string) => {
    try {
      await updateDoc(doc(db, "hugs", hugId), {
        hugBackSeenAt: Timestamp.now(),
      });
    } catch (err) {
      console.error(`Error while validating hugBack with id: ${hugId}`, err);
    }
  };

  const handleMarkHugSeen = async (hug: Hug) => {
    if (!user) return;

    if (hug.from === user.uid) {
      if (!hug.hugBackAt || hug.hugBackSeenAt) return;
      await markHugBackSeen(hug.id);
    } else {
      if (hug.seenAt) return;
      await markHugSeen(hug.id);
    }
  };

  const handleOpen = () => {
    if (selection) handleMarkHugSeen(selection.hug);
  };

  const handleClose = () => {
    if (selection) handleMarkHugSeen(selection.hug);
    setSelection(undefined);
  };

  const { total: totalNumHugs } = useHugTotals();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hugs</Text>
        {totalNumHugs && totalNumHugs > 0 && (
          <View style={styles.allTime}>
            <Text style={styles.heart}>♥</Text>
            <Text style={styles.allTimeText}>{totalNumHugs} all-time</Text>
          </View>
        )}
      </View>

      {totalNumHugs === 0 ? (
        <HugsEmptyState
          title="No hugs yet"
          hint="Send one and it'll show up here."
        />
      ) : (
        <>
          <FilterTabs value={tab} onChange={setTab} />
          <HugTimeline
            filter={tab}
            onSelectHug={(hug, direction) => setSelection({ hug, direction })}
          />
          {/* <FilterTabs value={tab} onChange={setTab} /> */}

          {/* {tab === "received" ? (
            <ReceivedHugsList
              onSelectHug={(hug) =>
                setSelection({ hug, direction: "incoming" })
              }
            />
          ) : (
            <SentHugsList
              onSelectHug={(hug) =>
                setSelection({ hug, direction: "outgoing" })
              }
            />
          )} */}
        </>
      )}

      {selection && (
        <HugViewOverlay3d
          hug={selection.hug}
          isReadOnly={selection.direction === "outgoing"}
          onOpen={handleOpen}
          onClose={handleClose}
          onIgnore={() => setSelection(undefined)}
        />
      )}
    </View>
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
