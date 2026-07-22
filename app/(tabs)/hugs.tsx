import { FilterTabs, Tab } from "@/components/hug/HugListComponents";
import { HugsEmptyState } from "@/components/hug/HugsEmptyState";
import HugViewOverlay3d from "@/components/hug/HugViewOverlay3d";
import { ReceivedHugsList } from "@/components/hug/ReceivedHugsList";
import { SentHugsList } from "@/components/hug/SentHugsList";
import { colors, font, spacing } from "@/components/ui/squish/theme";
import useCreateHugWithNote from "@/hooks/useCreateHugWithNote";
import { useHugs } from "@/hooks/useIncomingHugs";
import { db } from "@/lib/firebaseConfig";
import { Hug } from "@/lib/handleHugs";
import { Direction } from "@/lib/hugs/groups";
import { useLocalSearchParams } from "expo-router";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

/** What the overlay is showing, and from which side. */
type Selection = { hug: Hug; direction: Direction };

export default function HugsListScreen() {
  const [tab, setTab] = useState<Tab>("received");
  const [selection, setSelection] = useState<Selection | undefined>();

  const { isLoading: incomingLoading, hugs: incomingHugs } =
    useHugs("incoming");
  const { isLoading: outgoingLoading, hugs: outgoingHugs } =
    useHugs("outgoing");

  const { hugId } = useLocalSearchParams();
  const { startHugWithNote } = useCreateHugWithNote();

  /* Deep link from a push notification always points at a received hug. */
  useEffect(() => {
    if (!hugId) return;
    const hug = incomingHugs.find((item) => item.id === hugId);
    if (hug) setSelection({ hug, direction: "incoming" });
  }, [hugId, incomingHugs]);

  /**
   * `seenAt` is the recipient's receipt. Only ever written from the incoming
   * side — opening your own sent hug must not mark it seen for the other
   * person.
   */
  const markSeen = async (hug: Hug) => {
    if (hug.seenAt) return;
    try {
      await updateDoc(doc(db, "hugs", hug.id), { seenAt: Timestamp.now() });
    } catch (err) {
      console.error(`Error while validating hug with id: ${hug.id}`, err);
    }
  };

  const handleOpen = () => {
    if (selection?.direction === "incoming") markSeen(selection.hug);
  };

  const handleClose = () => {
    if (selection?.direction === "incoming") markSeen(selection.hug);
    setSelection(undefined);
  };

  const handleHugBack = async () => {
    if (!selection) return;
    const { hug } = selection;
    await markSeen(hug);
    startHugWithNote({ displayName: hug.fromName, uid: hug.from });
    setSelection(undefined);
  };

  const total = incomingHugs.length + outgoingHugs.length;

  if (incomingLoading || outgoingLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hugs</Text>
        {total > 0 && (
          <View style={styles.allTime}>
            <Text style={styles.heart}>♥</Text>
            <Text style={styles.allTimeText}>{total} all-time</Text>
          </View>
        )}
      </View>

      {total === 0 ? (
        <HugsEmptyState
          title="No hugs yet"
          hint="Send one and it'll show up here."
        />
      ) : (
        <>
          <FilterTabs value={tab} onChange={setTab} />

          {tab === "received" ? (
            <ReceivedHugsList
              hugs={incomingHugs}
              onSelectHug={(hug) =>
                setSelection({ hug, direction: "incoming" })
              }
            />
          ) : (
            <SentHugsList
              hugs={outgoingHugs}
              onSelectHug={(hug) =>
                setSelection({ hug, direction: "outgoing" })
              }
            />
          )}
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
