import { PlushButton } from "@/components/ui/squish/PlushButton";
import { useAvatarThumb } from "@/hooks/useAvatarThumbnail";
import { Hug } from "@/lib/handleHugs";
import { counterpartyOf, Direction } from "@/lib/hugs/groups";
import { formatTimestamp, getNote } from "@/lib/util";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FriendAvatar } from "../ui/squish/FriendAvatar";
import { colors, font, radius, shadow, spacing } from "../ui/squish/theme";

export type Tab = "received" | "sent";

export const TABS: { key: Tab; label: string }[] = [
  { key: "received", label: "Received" },
  { key: "sent", label: "Sent" },
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
    {hug.hugBackAt && (
      <Ionicons name="people-outline" color={colors.plumInk} size={16} />
    )}
  </View>
);

export const SectionHeader = ({
  title,
  count,
}: {
  title: string;
  count?: number;
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {typeof count === "number" && count > 0 && (
      <View style={styles.countPill}>
        <Text style={styles.countPillText}>{count}</Text>
      </View>
    )}
  </View>
);

/* ------------------------------------------------------------------ */
/* Rows                                                                */
/* ------------------------------------------------------------------ */

/** An unseen incoming hug, with the call to action. Always incoming. */
export const NewHugRow = ({
  hug,
  showDivider,
  onSee,
}: {
  hug: Hug;
  showDivider: boolean;
  onSee?: () => void;
}) => {
  const photoUri = useAvatarThumb(hug.from);

  return (
    <View style={[styles.row, showDivider && styles.rowDivider]}>
      <FriendAvatar name={hug.fromName} photoUri={photoUri ?? undefined} />

      <View style={styles.rowBody}>
        <View style={styles.nameLine}>
          <Text style={styles.name} numberOfLines={1}>
            {hug.fromName}
          </Text>
          <View style={styles.newPill}>
            <Text style={styles.newPillText}>NEW</Text>
          </View>
        </View>

        <View style={styles.subLine}>
          <Text style={styles.subText} numberOfLines={1}>
            {formatTimestamp(hug.createdAt!.toDate())}
          </Text>
          <MetaIcons hug={hug} />
        </View>
      </View>

      <PlushButton variant="soft" onPress={onSee} label="see" height={40} />
    </View>
  );
};

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
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && styles.rowDivider,
        { backgroundColor: pressed ? colors.lilac : colors.surface },
      ]}
    >
      <FriendAvatar name={other.name} photoUri={photoUri ?? undefined} />

      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {isOutgoing ? `To ${other.name}` : other.name}
        </Text>
        <View style={styles.subLine}>
          <MetaIcons hug={hug} />
          {isOutgoing && <DeliveryIcons hug={hug} />}
        </View>
      </View>

      <Text style={styles.rowTime}>
        {formatTimestamp(hug.createdAt!.toDate())}
      </Text>
    </Pressable>
  );
};

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export const FilterTabs = ({
  value,
  onChange,
}: {
  value: Tab;
  onChange: (t: Tab) => void;
}) => (
  <View style={styles.tabsTrack}>
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
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  /* rows */
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.soft,
  },
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

  /* segmented tabs */
  tabsTrack: {
    flexDirection: "row",
    marginHorizontal: spacing.xl,
    backgroundColor: colors.mistBg,
    borderRadius: radius.pill,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  tabItemActive: {
    backgroundColor: colors.surface,
    ...shadow,
    shadowOpacity: 0.16,
    shadowRadius: 6,
  },
  tabLabel: {
    fontFamily: font.uiBold,
    fontSize: 14,
    color: colors.softInk,
  },
  tabLabelActive: {
    color: colors.deep,
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
});
