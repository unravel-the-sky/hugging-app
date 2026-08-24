import { useAvatarThumb } from "@/hooks/useAvatarThumbnail";
import { HugFilter, useUnreadHugsCount } from "@/hooks/useAllHugs";
import { Hug } from "@/lib/handleHugs";
import { threadOf } from "@/lib/hugs/thread";
import { isHugUnread } from "@/lib/hugs/features";
import { counterpartyOf, Direction } from "@/lib/hugs/groups";
import { formatTimestamp, getNote } from "@/lib/util";
import { Ionicons } from "@expo/vector-icons";
import { Timestamp } from "firebase/firestore";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FriendAvatar } from "../ui/squish/FriendAvatar";
import { ListRow } from "../ui/squish/ListRow";
import {
  colors,
  darken,
  font,
  radius,
  shadow,
  spacing,
} from "../ui/squish/theme";

const clock = (t?: Timestamp) =>
  t
    ? t.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

/* mint at 12px on white fails contrast — darken for text-sized use */
const SEEN = colors.primary;
const BACK = darken(colors.mint, 0.38);

export type Tab = HugFilter;

export const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "received", label: "Received" },
  { key: "sent", label: "Sent" },
  { key: "pending", label: "Pending" },
] as const;

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

export const MetaIcons = ({ hug }: { hug: Hug }) => {
  const hasNote = !!getNote(hug);
  const hasImage = !!hug.imagePath;
  if (!hasNote && !hasImage) return null;

  return (
    <View style={styles.metaIcons}>
      {hasNote && (
        <Ionicons
          name="document-text-outline"
          size={16}
          color={colors.softInk}
        />
      )}
      {hasImage && (
        <Ionicons name="image-outline" size={16} color={colors.softInk} />
      )}
    </View>
  );
};

/** Delivery state of a hug you sent: delivered → seen → hugged back. */
const DeliveryIcons = ({ hug }: { hug: Hug }) => (
  <View style={styles.deliveryIcons}>
    <Ionicons
      name={hug.seenAt ? "checkmark-done-outline" : "checkmark-outline"}
      color={hug.seenAt ? colors.deep : colors.plumInk}
      size={16}
    />
    {threadOf(hug).length > 0 && (
      <Ionicons name="people-outline" color={colors.plumInk} size={16} />
    )}
  </View>
);

export const SectionHeader = ({
  title,
  count,
  countTone = "unread",
  collapsible = false,
  expanded = false,
  onToggle,
}: {
  title: string;
  count?: number;
  countTone?: "unread" | "muted";
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) => {
  const showCount = typeof count === "number" && count > 0;

  const content = (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleGroup}>
        {collapsible && (
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-forward"}
            size={14}
            color={colors.softInk}
          />
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {showCount &&
        (countTone === "unread" ? (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{count}</Text>
          </View>
        ) : (
          <Text style={styles.countMuted}>{count}</Text>
        ))}
    </View>
  );

  if (!onToggle) return content;

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      style={({ pressed }) => pressed && styles.sectionHeaderPressed}
    >
      {content}
    </Pressable>
  );
};

/* ------------------------------------------------------------------ */
/* Rows                                                                */
/* ------------------------------------------------------------------ */
/**
 * One hug in a list, from either direction.
 *
 * The avatar and name always belong to the *other* person — previously the
 * outgoing variant showed the sender's own initial next to "To <name>".
 */
export const HugRow = ({
  hug,
  direction,
  showDivider,
  onPress,
}: {
  hug: Hug;
  direction: Direction;
  showDivider: boolean;
  onPress?: () => void;
}) => {
  const other = counterpartyOf(hug, direction);
  const photoUri = useAvatarThumb(other.uid);
  const isOutgoing = direction === "outgoing";

  return (
    <ListRow onPress={onPress} showDivider={showDivider}>
      <FriendAvatar name={other.name} photoUri={photoUri ?? undefined} />

      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {isOutgoing ? `To ${other.name}` : other.name}
        </Text>
        <View style={styles.subLine}>
          <MetaIcons hug={hug} />
          <DeliveryIcons hug={hug} />
        </View>
      </View>

      <Text style={styles.rowTime}>
        {hug.createdAt ? formatTimestamp(hug.createdAt.toDate()) : "sending…"}
      </Text>
    </ListRow>
  );
};

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

/**
 * Standalone pills rather than a segmented track: four labels don't divide
 * evenly into a fixed width, so they scroll instead of squeezing.
 */
export const FilterTabs = ({
  value,
  onChange,
}: {
  value: Tab;
  onChange: (t: Tab) => void;
}) => {
  const unreadHugsCount = useUnreadHugsCount();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsTrack}
    >
      {TABS.map((t) => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[styles.tabItem, active && styles.tabItemActive]}
          >
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {t.label}
              {t.key === "new" &&
                unreadHugsCount > 0 &&
                ` (${unreadHugsCount})`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const DirectionBadge = ({
  hug,
  direction,
}: {
  hug: Hug;
  direction: Direction;
}) => {
  const isOutgoing = direction === "outgoing";
  const opened = isOutgoing && !!hug.seenAt;

  return (
    <View
      style={[
        styles.dirBadge,
        {
          backgroundColor: isOutgoing
            ? hug.seenAt
              ? darken(colors.mint, 0.38)
              : colors.peach
            : colors.primary,
        },
      ]}
    >
      <Ionicons
        name={
          opened ? "checkmark-done" : isOutgoing ? "arrow-up" : "arrow-down"
        }
        size={opened ? 12 : 11}
        color={colors.surface}
      />
    </View>
  );
};

const StatusStack = ({
  hug,
  direction,
}: {
  hug: Hug;
  direction: Direction;
}) => {
  const hugBackCount = threadOf(hug).length;
  const hasStatus = !!hug.seenAt || hugBackCount > 0;

  return (
    <View style={styles.statusStack}>
      <Text style={styles.timeSent}>{clock(hug.createdAt)}</Text>

      {hasStatus && (
        <View style={styles.statusLine}>
          {!!hug.seenAt && direction === "incoming" && (
            <Ionicons name="checkmark-done" size={14} color={SEEN} />
          )}
          {hugBackCount > 0 && (
            <>
              <Ionicons name="people" size={14} color={BACK} />
              {hugBackCount > 1 && (
                <Text style={styles.backCount}>{hugBackCount}</Text>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

/** Compact row for the merged timeline: direction lives on the row, not the list. */
export const TimelineHugRow = ({
  hug,
  direction,
  showDivider,
  userId,
  onPress,
}: {
  hug: Hug;
  direction: Direction;
  showDivider: boolean;
  userId: string;
  onPress?: () => void;
}) => {
  const other = counterpartyOf(hug, direction);
  const photoUri = useAvatarThumb(other.uid);
  const isOutgoing = direction === "outgoing";
  // const isNew = !isOutgoing && !hug.seenAt;
  const isNew = isHugUnread(hug, userId);

  return (
    <ListRow onPress={onPress} showDivider={showDivider} dense>
      <View>
        <FriendAvatar name={other.name} photoUri={photoUri ?? undefined} />
        <DirectionBadge direction={direction} hug={hug} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.nameLine}>
          <Text style={styles.rowName} numberOfLines={1}>
            {isOutgoing ? `To ${other.name}` : other.name}
          </Text>
          {isNew && (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>NEW</Text>
            </View>
          )}
        </View>
      </View>

      <StatusStack hug={hug} direction={direction} />
    </ListRow>
  );
};

/**
 * A person's run of hugs in one day, folded into a single row. Tapping it
 * unfolds the run below; the chevron is the only affordance, so the row reads
 * the same as the hug rows it stands in for.
 */
export const PersonClusterRow = ({
  hugs,
  uid,
  name,
  userId,
  expanded,
  showDivider,
  onPress,
}: {
  hugs: Hug[];
  uid: string;
  name: string;
  userId: string;
  expanded: boolean;
  showDivider: boolean;
  onPress: () => void;
}) => {
  const photoUri = useAvatarThumb(uid);
  const unread = hugs.filter((hug) => isHugUnread(hug, userId)).length;

  return (
    <ListRow onPress={onPress} showDivider={showDivider} dense>
      <FriendAvatar name={name} photoUri={photoUri ?? undefined} />

      <View style={styles.rowBody}>
        <View style={styles.nameLine}>
          <Text style={styles.rowName} numberOfLines={1}>
            {name}
          </Text>
          {unread > 0 && (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>{unread} NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.subText}>{hugs.length} hugs</Text>
      </View>

      <Ionicons
        name={expanded ? "chevron-up" : "chevron-down"}
        size={18}
        color={colors.softInk}
      />
    </ListRow>
  );
};

/** Day header with the trailing rule from the mockup. */
export const DayHeader = ({ title }: { title: string }) => (
  <View style={styles.dayHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.dayRule} />
  </View>
);

const styles = StyleSheet.create({
  /* rows */
  rowBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  rowName: {
    fontFamily: font.uiBold,
    fontSize: 16,
    color: colors.plumInk,
    marginBottom: 2,
  },
  rowTime: {
    fontFamily: font.ui,
    fontSize: 13,
    color: colors.softInk,
    marginLeft: spacing.sm,
  },

  /* name + subtitle lines */
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    fontFamily: font.uiBold,
    fontSize: 16,
    color: colors.plumInk,
    flexShrink: 1,
  },
  newPill: {
    backgroundColor: colors.soft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newPillText: {
    fontFamily: font.uiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.deep,
  },
  subLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
  },
  subText: {
    fontFamily: font.ui,
    fontSize: 14,
    color: colors.softInk,
    flexShrink: 1,
  },
  metaIcons: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  deliveryIcons: {
    flexDirection: "row",
    gap: spacing.xs,
  },

  /* filter pills */
  tabsTrack: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    ...shadow,
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
    shadowOpacity: 0.24,
  },
  tabLabel: {
    fontFamily: font.uiBold,
    fontSize: 14,
    color: colors.softInk,
  },
  tabLabelActive: {
    color: colors.surface,
  },

  /* section headers */
  sectionHeader: {
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
    textTransform: "uppercase",
    color: colors.softInk,
  },
  countPill: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    backgroundColor: colors.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  countPillText: {
    fontFamily: font.uiBold,
    fontSize: 12,
    color: colors.surface,
  },
  sectionTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  sectionHeaderPressed: {
    opacity: 0.6,
  },
  countMuted: {
    fontFamily: font.uiBold,
    fontSize: 13,
    color: colors.softInk,
    minWidth: 22, // matches countPill so headers don't jitter
    textAlign: "center",
  },

  // timeline stuf here
  dirBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    minWidth: 20, // was width: 20
    height: 20,
    paddingHorizontal: 2,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  dirBadgeWide: {
    // paddingHorizontal: 4,
    // right: -4, // keeps the circle visually centred on the avatar edge
  },
  statusStack: {
    alignItems: "flex-end",
    marginLeft: spacing.sm,
    gap: 1,
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  /** Turn count next to the hug-back icon, once a thread has more than one. */
  backCount: {
    fontFamily: font.uiBold,
    fontSize: 12,
    color: BACK,
  },
  timeSent: {
    fontFamily: font.uiBold,
    fontSize: 14,
    color: colors.plumInk,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  dayRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.soft,
  },
});
