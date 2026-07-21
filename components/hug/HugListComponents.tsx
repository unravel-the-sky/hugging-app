import { PlushButton } from "@/components/ui/squish/PlushButton";
import { useAvatarThumb } from "@/hooks/useAvatarThumbnail";
import { Hug } from "@/lib/handleHugs";
import {
  avatarColor,
  formatTimestamp,
  getNote,
  readableText,
} from "@/lib/util";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  colors,
  font,
  radius,
  shadow,
  spacing,
} from "../../components/ui/squish/theme";
import { FriendAvatar } from "../ui/squish/FriendAvatar";

export type Tab = "received" | "sent";

export type Section = {
  key: "new" | "seen";
  title: string;
  count?: number;
  data: Hug[];
};

export const TABS: { key: Tab; label: string }[] = [
  { key: "received", label: "Received" },
  { key: "sent", label: "Sent" },
] as const;

export const HugAvatar = ({ name }: { name: string }) => {
  const bg = avatarColor(name);
  return (
    <View style={styles.avatarWrap}>
      <View style={[styles.avatar, { backgroundColor: bg }]}>
        <Text style={[styles.avatarLetter, { color: readableText(bg) }]}>
          {name?.[0]?.toUpperCase() ?? "?"}
        </Text>
      </View>
    </View>
  );
};

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

export const SeeButton = ({ onPress }: { onPress?: () => void }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.seeBtn,
        pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
      ]}
    >
      <Text style={styles.seeBtnIcon}>✋</Text>
      <Text style={styles.seeBtnText}>SEE</Text>
    </Pressable>
  );
};

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

export const SeenHugRow = ({
  hug,
  isOutgoing,
  showDivider,
  onPress,
}: {
  hug: Hug;
  isOutgoing: boolean;
  showDivider: boolean;
  onPress?: () => void;
}) => {
  const display = isOutgoing ? `To ${hug.toName}` : hug.fromName;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.seenRow,
        showDivider && styles.rowDivider,
        {
          backgroundColor: pressed ? colors.lilac : colors.surface,
          overflow: "hidden",
        },
      ]}
    >
      <FriendAvatar name={hug.fromName} uid={isOutgoing ? hug.to : ""} />

      <View style={styles.rowBody}>
        <Text style={styles.seenName} numberOfLines={1}>
          {display}
        </Text>
        <View style={styles.subLine}>
          <MetaIcons hug={hug} />
          {isOutgoing && (
            <View style={{ flex: 1, flexDirection: "row", gap: 4 }}>
              {hug.seenAt ? (
                <Ionicons
                  name="checkmark-done-outline"
                  color={colors.deep}
                  size={16}
                />
              ) : (
                <Ionicons
                  name="checkmark-outline"
                  color={colors.plumInk}
                  size={16}
                />
              )}
              {hug.hugBackAt && (
                <Ionicons
                  name="people-outline"
                  color={colors.plumInk}
                  size={16}
                />
              )}
            </View>
          )}
        </View>
      </View>

      <Text style={styles.seenTime}>
        {formatTimestamp(hug.createdAt!.toDate())}
      </Text>
    </Pressable>
  );
};

export const FilterTabs = ({
  value,
  onChange,
}: {
  value: Tab;
  onChange: (t: Tab) => void;
}) => {
  return (
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
};

export const SectionHeader = ({
  title,
  count,
}: {
  title: string;
  count?: number;
}) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {typeof count === "number" && count > 0 && (
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{count}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  /* avatar + sticker badge */
  avatarWrap: {
    width: 50,
    height: 50,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontFamily: font.displayBold,
    fontSize: 20,
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
  seenName: {
    fontFamily: font.uiBold,
    fontSize: 16,
    color: colors.plumInk,
    marginBottom: 2,
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
  metaIcon: {
    fontSize: 12,
  },

  /* SEE button (swap for your PlushButton if you'd rather) */
  seeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.button,
    ...shadow,
    shadowOpacity: 0.28,
  },
  seeBtnIcon: {
    fontSize: 13,
  },
  seeBtnText: {
    fontFamily: font.uiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: "#FFFFFF",
  },
  seenTime: {
    fontFamily: font.ui,
    fontSize: 13,
    color: colors.softInk,
    marginLeft: spacing.sm,
  },

  /* rows */
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  seenRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.soft,
  },
  rowBody: {
    flex: 1,
    marginLeft: spacing.md,
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

  /* scroll + sections */
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  sectionTitle: {
    fontFamily: font.uiBold,
    fontSize: 13,
    letterSpacing: 1,
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
    color: "#FFFFFF",
  },
});
