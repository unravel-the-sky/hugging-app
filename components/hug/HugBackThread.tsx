import { Hug } from "@/lib/handleHugs";
import { relTime } from "@/lib/hugs/time";
import { threadOf } from "@/lib/hugs/thread";
import { readableText } from "@/lib/util";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  colors,
  font,
  LabeledDivider,
  radius,
  shadow,
  spacing,
} from "../ui/squish";
import { FriendAvatar } from "../ui/squish/FriendAvatar";

/**
 * The hug-back thread as a stack of cards under the postcard: mine on the
 * right, theirs on the left, oldest first.
 *
 * Each turn is an avatar beside a card: the avatar sits outside the card,
 * vertically centred against it, and the note's byline lives inside the card
 * under the text where it always has a readable surface behind it.
 *
 * Anchored to the bottom: the newest turn keeps the same position on screen
 * whether the thread has one entry or six, so the button below it never
 * shifts under your thumb. Long threads scroll inside this band.
 */
export function HugBackThread({ hug, myUid }: { hug: Hug; myUid?: string }) {
  const scrollRef = useRef<ScrollView>(null);
  /**
   * Opening a hug should land on the newest turn, not the oldest. Jump there
   * on first paint, then animate for turns that arrive while you are looking.
   */
  const painted = useRef(false);
  useEffect(() => {
    painted.current = false;
  }, [hug.id]);

  const stickToEnd = () => {
    scrollRef.current?.scrollToEnd({ animated: painted.current });
    painted.current = true;
  };

  const thread = threadOf(hug);
  if (thread.length === 0) return null;

  // The backdrop is the sender's pick, so the rule takes its ink from the same
  // helper the header uses rather than assuming a light or dark ground.
  const ink = readableText(hug.backgroundColor || colors.mistBg);

  return (
    <View style={styles.wrap}>
      {/* Labels the band under the postcard, and stays put while the turns
          below it scroll. */}
      <LabeledDivider label="hug backs" tint={ink} style={styles.divider} />

      <ScrollView
        ref={scrollRef}
        onContentSizeChange={stickToEnd}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {thread.map((item, index) => {
          const mine = item.from === myUid;
          const authorName =
            (item.from === hug.from ? hug.fromName : hug.toName) ?? "someone";

          return (
            <View
              key={`${item.from}-${item.createdAt.toMillis()}-${index}`}
              style={[styles.turn, mine ? styles.turnMine : styles.turnTheirs]}
            >
              <FriendAvatar name={authorName} uid={item.from} size={40} />

              <View style={styles.card}>
                <Text style={styles.note}>{item.note}</Text>
                <Text
                  style={[styles.byline, mine && styles.bylineMine]}
                  numberOfLines={1}
                >
                  {authorName.toLowerCase()} -{" "}
                  {relTime(item.createdAt.toMillis())}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  divider: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  // Takes all the room the action row below it doesn't need, so the turns
  // start directly under the postcard and grow down toward the button, which
  // keeps its place at the bottom of the fixed footer either way.
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  turn: {
    flexDirection: "row",
    // Centred against the card, not against its first line, so a one-line and
    // a four-line note both look deliberate.
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: "90%",
  },
  turnMine: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  turnTheirs: {
    alignSelf: "flex-start",
  },
  card: {
    // Shrinks so a long note wraps inside the row instead of pushing the
    // avatar out of the band.
    flexShrink: 1,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    ...shadow,
  },
  note: {
    fontFamily: font.uiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.plumInk,
  },
  byline: {
    fontFamily: font.ui,
    fontSize: 12,
    color: colors.softInk,
  },
  bylineMine: {
    textAlign: "right",
  },
});
