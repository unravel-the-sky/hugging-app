import {
  FilterTabs,
  NewHugRow,
  SeenHugRow,
  Tab,
} from "@/components/hug/HugListComponents";
import HugViewOverlay3d from "@/components/hug/HugViewOverlay3d";
import { FriendAvatar } from "@/components/ui/squish/FriendAvatar";
import useCreateHugWithNote from "@/hooks/useCreateHugWithNote";
import { useHugs } from "@/hooks/useIncomingHugs";
import { db } from "@/lib/firebaseConfig";
import { Hug } from "@/lib/handleHugs";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  colors,
  font,
  hugTypes,
  HugTypeKey,
  radius,
  shadow,
  spacing,
  tint,
} from "../../components/ui/squish/theme";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const MIN_HUGS = 10;

const hugMillis = (h: Hug): number =>
  (h as any).createdAt?.toDate?.().getTime?.() ?? 0;

const hugTypeLabel = (h: Hug): string => {
  const key = (h as any).type as HugTypeKey | undefined;
  return (key && hugTypes[key]?.label) || "Hug";
};

const relTime = (ms: number): string => {
  if (!ms) return "";
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
};

type PersonGroup = {
  uid: string;
  name: string;
  hugs: Hug[]; // this person's incoming hugs, newest first
  count: number;
  last: Hug;
};

const TopHuggerBadge = () => (
  <View style={styles.topBadge}>
    <Text style={styles.topBadgeText}>TOP HUGGER</Text>
  </View>
);

const PersonRow = ({
  group,
  isTop,
  expanded,
  onToggle,
  onSeeHug,
}: {
  group: PersonGroup;
  isTop: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSeeHug: (hug: Hug) => void;
}) => {
  const [contentHeight, setContentHeight] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, progress]);

  const bodyStyle = useAnimatedStyle(() => ({
    height: progress.value * contentHeight,
    opacity: progress.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 90}deg` }],
  }));

  return (
    <View style={[styles.personCard, isTop && styles.personCardTop]}>
      <Pressable style={styles.personRow} onPress={onToggle}>
        <View style={isTop && styles.avatarRing}>
          <FriendAvatar name={group.name} />
        </View>

        <View style={styles.personBody}>
          <View style={styles.personNameRow}>
            {isTop && <TopHuggerBadge />}
            <Text style={styles.personName} numberOfLines={1}>
              {group.name}
            </Text>
          </View>
          <Text style={styles.personLast} numberOfLines={1}>
            {relTime(hugMillis(group.last))}
          </Text>
        </View>

        {!expanded && (
          <View style={styles.countPill}>
            <Text style={styles.countPillNum}>{group.count}</Text>
            <Text style={styles.countPillLabel}>HUGS</Text>
          </View>
        )}

        <Animated.View style={[styles.chevron, chevronStyle]}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Animated.View>
      </Pressable>

      <Animated.View style={[styles.expandClip, bodyStyle]}>
        <View
          style={styles.expandMeasure}
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
        >
          {group.hugs.map((h, i) => (
            <SeenHugRow
              key={h.id}
              hug={h}
              isOutgoing={false}
              showDivider={i < group.hugs.length - 1}
              onPress={() => onSeeHug(h)}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

export default function HugsListScreen() {
  const [seeHug, setSeeHug] = useState<Hug | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("received");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { isLoading: incomingLoading, hugs: incomingHugs } =
    useHugs("incoming");
  const { isLoading: outgoingLoading, hugs: outgoingHugs } =
    useHugs("outgoing");

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
    setSeeHug(hug);
  };

  const toggleExpand = (uid: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

  const total = incomingHugs.length + outgoingHugs.length;

  // Unseen incoming hugs → "NEW HUGS" section, newest first.
  const newHugs = useMemo(
    () =>
      incomingHugs
        .filter((h) => !h.seenAt)
        .sort((a, b) => hugMillis(b) - hugMillis(a)),
    [incomingHugs],
  );

  // All incoming hugs, grouped by sender
  // const groupsNew = Object.groupBy(incomingHugs, ({ fromName }) => fromName);
  // console.log("groupsNew: ", groupsNew);
  const groups = useMemo<PersonGroup[]>(() => {
    const map = new Map<string, Hug[]>();
    for (const h of incomingHugs) {
      const arr = map.get(h.from) ?? [];
      arr.push(h);
      map.set(h.from, arr);
    }

    const list: PersonGroup[] = [];
    for (const [uid, hugs] of map) {
      const sorted = [...hugs].sort((a, b) => hugMillis(b) - hugMillis(a));
      list.push({
        uid,
        name: sorted[0]?.fromName ?? "Someone",
        hugs: sorted,
        count: sorted.length,
        last: sorted[0],
      });
    }

    // Who has the most hugs (strict > keeps the first one on ties)
    let topUid: string | undefined;
    let topCount = -1;
    for (const g of list) {
      if (g.count > topCount) {
        topCount = g.count;
        topUid = g.uid;
      }
    }

    // Top hugger pinned first; everyone else by most recent hug
    return list.sort((a, b) => {
      if (a.uid === topUid) return -1;
      if (b.uid === topUid) return 1;
      return hugMillis(b.last) - hugMillis(a.last);
    });
  }, [incomingHugs]);

  // Top hugger = the person who's sent the most.
  const topHuggerUid = useMemo(() => {
    let best: PersonGroup | undefined;
    for (const g of groups) if (!best || g.count > best.count) best = g;
    if (!best?.hugs) return null;
    return best.hugs.length > MIN_HUGS ? best?.uid : null;
  }, [groups]);

  const listRef = useRef<FlatList<PersonGroup>>(null);

  const handleToggle = (uid: string, index: number) => {
    const willExpand = !expanded.has(uid);
    toggleExpand(uid);
    if (willExpand) {
      listRef.current?.scrollToIndex({
        index,
        viewPosition: 0,
        viewOffset: spacing.md,
        animated: true,
      });
    }
  };

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

      {tab === "received" ? (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.uid}
          extraData={expanded}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {newHugs.length > 0 && (
                <>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>NEW HUGS</Text>
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>{newHugs.length}</Text>
                    </View>
                  </View>

                  <View style={styles.card}>
                    {newHugs.map((h, i) => (
                      <NewHugRow
                        key={h.id}
                        hug={h}
                        showDivider={i < newHugs.length - 1}
                        onSee={() => handleSeeHug(h)}
                      />
                    ))}
                  </View>
                </>
              )}

              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>ALDREADY SEEN</Text>
                {/* <Text style={styles.hint}>tap to expand</Text> */}
              </View>
            </View>
          }
          renderItem={({ item, index }) => (
            <PersonRow
              group={item}
              isTop={item.uid === topHuggerUid}
              expanded={expanded.has(item.uid)}
              onToggle={() => handleToggle(item.uid, index)}
              onSeeHug={handleSeeHug}
            />
          )}
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
      ) : (
        <FlatList
          data={outgoingHugs}
          keyExtractor={(h) => h.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.cardItem,
                index === 0 && styles.cardItemFirst,
                index === outgoingHugs.length - 1 && styles.cardItemLast,
              ]}
            >
              <SeenHugRow
                hug={item}
                isOutgoing
                showDivider={index < outgoingHugs.length - 1}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🤗</Text>
              <Text style={styles.emptyTitle}>No hugs sent yet</Text>
            </View>
          }
        />
      )}

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
  emptyEmoji: { fontSize: 80, marginBottom: 16 },
  emptyTitle: {
    fontFamily: font.displayBold,
    fontSize: 24,
    color: colors.plumInk,
    marginBottom: 8,
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
  allTime: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  heart: { color: colors.blush, fontSize: 16 },
  allTimeText: { fontFamily: font.ui, fontSize: 15, color: colors.softInk },

  /* list */
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120, // clears the floating tab bar
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: font.uiBold,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.softInk,
  },
  hint: { fontFamily: font.ui, fontSize: 13, color: colors.softInk },

  newBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  newBadgeText: {
    fontFamily: font.uiBold,
    fontSize: 12,
    color: colors.surface,
  },

  /* one rounded card wrapping a set of rows (NEW HUGS) */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadow,
    marginBottom: spacing.xl,
  },

  /* BY PERSON */
  personCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
    ...shadow,
  },
  personCardTop: {
    backgroundColor: tint(colors.butter, 0.65),
    borderWidth: 1,
    borderColor: colors.butter,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  avatarRing: {
    // borderWidth: 3,
    borderColor: colors.butter,
    borderRadius: radius.pill,
    padding: 2,
  },
  personBody: { flex: 1, marginLeft: spacing.sm },
  personNameRow: {
    gap: spacing.sm,
  },
  personName: {
    fontFamily: font.displayBold,
    fontSize: 18,
    color: colors.plumInk,
    flexShrink: 1,
  },
  personLast: {
    fontFamily: font.ui,
    fontSize: 14,
    color: colors.softInk,
    marginTop: 2,
  },
  topBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.butter,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  topBadgeText: {
    fontFamily: font.uiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.plumInk,
  },
  countPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: "center",
    ...shadow,
    shadowOpacity: 0.18,
  },
  countPillNum: {
    fontFamily: font.displayBold,
    color: colors.surface,
  },
  countPillLabel: {
    fontFamily: font.uiBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.surface,
    opacity: 0.85,
  },
  chevron: { marginLeft: spacing.xs },

  expandClip: {
    overflow: "hidden", // this is what actually clips the content as height shrinks
  },
  expandMeasure: {
    position: "absolute", // laid out at natural height, ignored by the clip's height
    left: 0,
    right: 0,
    top: 0,
    borderTopWidth: 1,
    borderTopColor: tint(colors.softInk, 0.55),
    backgroundColor: colors.surface,
  },

  /* sent tab reuses the grouped-card pattern */
  cardItem: { backgroundColor: colors.surface, overflow: "hidden" },
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
