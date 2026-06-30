import {
  FilterTabs,
  NewHugRow,
  Section,
  SectionHeader,
  SeenHugRow,
  Tab,
} from "@/components/hug/HugListComponents";
import HugViewOverlay3d from "@/components/hug/HugViewOverlay3d";
import useCreateHugWithNote from "@/hooks/useCreateHugWithNote";
import { useHugs } from "@/hooks/useIncomingHugs";
import { auth, db } from "@/lib/firebaseConfig";
import { Hug } from "@/lib/handleHugs";
import { useLocalSearchParams } from "expo-router";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  colors,
  font,
  radius,
  shadow,
  spacing,
} from "../../components/ui/squish/theme";

export default function HugsListScreen() {
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid;

  const [seeHug, setSeeHug] = useState<Hug | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("received");

  const { isLoading: incomingLoading, hugs: incomingHugs } = useHugs(
    uid,
    "incoming",
  );
  const { isLoading: outgoingLoading, hugs: outgoingHugs } = useHugs(
    uid,
    "outgoing",
  );

  const { hugId } = useLocalSearchParams();
  const { startHugWithNote } = useCreateHugWithNote();

  useEffect(() => {
    if (!hugId) return;
    const hug = incomingHugs.find((item) => item.id === hugId);
    setSeeHug(hug);
  }, [hugId, incomingHugs]);

  const handleValidateHug = async (hugId: string) => {
    const now = Timestamp.now();
    const hugRef = doc(db, "hugs", hugId);
    try {
      await updateDoc(hugRef, { seenAt: now });
    } catch (err) {
      console.error(`Error while validating hug with id: ${hugId}`, err);
    }
  };

  const handleHugBack = async (hug: Hug) => {
    await handleValidateHug(hug.id);
    startHugWithNote({ displayName: hug.fromName, uid: hug.from });
    setSeeHug(undefined);
  };

  const handleSeeHug = (hug: Hug) => {
    console.log("seeHug: ", hug);
    setSeeHug(hug);
  };

  const total = incomingHugs.length + outgoingHugs.length;

  const sections = useMemo(() => {
    const newList =
      tab === "received" ? incomingHugs.filter((h) => !h.seenAt) : [];
    const seenList =
      tab === "received"
        ? incomingHugs.filter((h) => !!h.seenAt)
        : outgoingHugs;

    const result: Section[] = [];
    if (newList.length > 0) {
      result.push({
        key: "new",
        title: "NEW",
        count: newList.length,
        data: newList,
      });
    }
    if (seenList.length > 0) {
      result.push({ key: "seen", title: "ALREADY SEEN", data: seenList });
    }
    return result;
  }, [tab, incomingHugs, outgoingHugs]);

  if (incomingLoading || outgoingLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (incomingHugs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🤗</Text>
        <Text style={styles.emptyTitle}>No hugs yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hugs</Text>
        <View style={styles.allTime}>
          <Text style={styles.heart}>♥</Text>
          <Text style={styles.allTimeText}>{total} all-time</Text>
        </View>
      </View>

      <FilterTabs value={tab} onChange={setTab} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} count={section.count} />
        )}
        renderSectionFooter={() => <View style={styles.sectionGap} />}
        renderItem={({ item, index, section }) => {
          const isFirst = index === 0;
          const isLast = index === section.data.length - 1;

          if (section.key === "new") {
            return (
              <View
                style={[
                  styles.cardItem,
                  isFirst && styles.cardItemFirst,
                  isLast && styles.cardItemLast,
                ]}
              >
                <NewHugRow
                  hug={item}
                  showDivider={!isLast}
                  onSee={() => handleSeeHug(item)}
                />
              </View>
            );
          }

          const isOutgoing = item.from === uid;
          return (
            <View
              style={[
                styles.cardItem,
                isFirst && styles.cardItemFirst,
                isLast && styles.cardItemLast,
              ]}
            >
              <SeenHugRow
                hug={item}
                isOutgoing={isOutgoing}
                showDivider={!isLast}
                onPress={isOutgoing ? undefined : () => handleSeeHug(item)}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🤗</Text>
            <Text style={styles.emptyTitle}>
              {tab === "sent" ? "No hugs sent yet" : "No hugs yet"}
            </Text>
          </View>
        }
      />

      {seeHug?.id && (
        <HugViewOverlay3d
          hug={seeHug}
          onHugBack={() => handleHugBack(seeHug)}
          onOpen={() => handleValidateHug(seeHug.id)}
          onClose={() => {
            handleValidateHug(seeHug.id);
            setSeeHug(undefined);
          }}
          onIgnore={() => setSeeHug(undefined)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Reuse the same styles for incoming and outgoing tabs, just change the background color
  container: {
    flex: 1,
    backgroundColor: colors.soft,
    flexDirection: "column",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.soft,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: colors.soft,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  addFriendButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addFriendButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  listContainer: {
    padding: 16,
  },

  /* header */
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

  /** sections list */
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120, // clears the floating tab bar
  },
  sectionGap: {
    height: spacing.xl,
  },
  cardItem: {
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  cardItemFirst: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...shadow,
  },
  cardItemLast: {
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    ...shadow,
  },
});
