import { TabBarContext } from "@/app/context/TabBarContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Hug } from "@/lib/handleHugs";
import { canHugBack, hugBacksLeft, threadOf } from "@/lib/hugs/thread";
import { formatTimestamp, readableText } from "@/lib/util";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { use, useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { ConfirmationModal } from "../ui/ConfirmationModal";
import { colors, font, radius, shadow, spacing } from "../ui/squish";
import { FriendAvatar } from "../ui/squish/FriendAvatar";
import { PlushButton } from "../ui/squish/PlushButton";
import Toast from "../ui/squish/Toast";
import { HugBackThread } from "./HugBackThread";
import { HugFaceSeal } from "./HugFaceSeal";
import HugRevealerImage from "./HugRevealerImage";

// Lavender gradient from the "Sealed (before)" screen.
const SEALED_BG = ["#ddd6ef", "#d3cfdb"] as const;

/** Height of the band below the card. Shared with the card, which sits above it. */
const FOOTER_HEIGHT = 260;
/** With no thread to show, the card can drop back down over the button row. */
const BARE_FOOTER_HEIGHT = 150;

/**
 * Swipe-to-dismiss, standing in for the native stack's back gesture — the hug
 * view is state inside the hugs tab, not a pushed route, so there is no
 * navigator to inherit that from.
 *
 * Started from the left edge only, like iOS: the card in the middle owns its
 * own pan for tilt and flip, and the stage's 32px inset keeps the two apart.
 */
const EDGE_WIDTH = 32;
/** Drag past this, or flick faster than the velocity, and the hug closes. */
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 600;

interface HugViewOverlayProps {
  hug: Hug;
  /**
   * Skip the sealed-envelope ceremony and show the card straight away, for a
   * hug you sent yourself — there is nothing to reveal.
   *
   * This used to be `isReadOnly` and also gated the hug-back button, which
   * was fine while only the recipient could answer. Now both sides take
   * turns, so who may act is `canHugBack`'s call alone.
   */
  startsOpen?: boolean;
  onHugBack?: (hug: Hug) => void;
  onOpen: () => void;
  onClose: () => void;
  onIgnore: () => void;
}

export default function HugViewOverlay({
  hug,
  startsOpen,
  onHugBack,
  onOpen,
  onClose,
  onIgnore,
}: HugViewOverlayProps) {
  const [opened, setOpened] = useState(false);

  const { setIsTabBarHidden } = use(TabBarContext);

  useFocusEffect(() => {
    setIsTabBarHidden(true);
    return () => setIsTabBarHidden(false);
  });

  const [confirmVisible, setConfirmVisible] = useState(false);
  /** Which hint the reader tapped, and so which explanation the modal shows. */
  const [infoTopic, setInfoTopic] = useState<"limit" | "turn" | null>(null);

  const { user } = useCurrentUser();
  const myUid = user?.uid;

  const isSender = hug.from === user?.uid;
  const senderName = hug.fromName ?? "Someone";
  const recipientName = hug.toName ?? "Someone";
  /** The person on the other end, whichever side of the hug I'm on. */
  const otherName = hug.from === user?.uid ? recipientName : senderName;

  const insets = useSafeAreaInsets();

  // The header sits on the sender's backdrop, so its ink follows it.
  const backdrop = hug.backgroundColor || colors.mistBg;
  const headerInk = readableText(backdrop);
  const sentAt = hug.createdAt?.toDate?.();

  // The hug arrives live from the hugs stream, so a hug-back written on the
  // /hug-back screen shows up here as a prop change.
  const thread = threadOf(hug);
  const latest = thread[thread.length - 1];
  // Identifies a turn without needing a stable id: two turns by the same
  // person can't share a millisecond.
  const latestKey = latest
    ? `${latest.from}-${latest.createdAt.toMillis()}`
    : null;

  const myTurn = myUid ? canHugBack(hug, myUid) : false;
  const turnsLeft = myUid ? hugBacksLeft(hug, myUid) : 0;

  // Whatever the thread ended with when this hug was first shown; anything
  // past that landed while the overlay was open, and gets confirmed once.
  const seenTurn = useRef(latestKey);

  // Reset to sealed whenever a different hug is opened. Declared before the
  // effect below so the new hug's thread counts as already seen, not as new.
  useEffect(() => {
    setOpened(false);
    seenTurn.current = latestKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hug.id]);

  useEffect(() => {
    const isNew = !!latestKey && latestKey !== seenTurn.current;
    seenTurn.current = latestKey;
    if (!isNew) return;

    setConfirmVisible(true);
    const timer = setTimeout(() => setConfirmVisible(false), 25000);
    return () => clearTimeout(timer);
  }, [latestKey]);

  /** The hug is a window onto a friendship; the header is the way into it. */
  const openMemoryLane = () => {
    router.push({
      pathname: "/friend-memory-lane",
      params: { friendId: isSender ? hug.to : hug.from },
    });
  };

  const handleHugBack = () => {
    router.push({
      pathname: "/hug-back",
      params: { hugId: hug.id, toName: otherName },
    });
  };

  const { width: screenW } = useWindowDimensions();
  const dragX = useSharedValue(0);
  /** Only a drag that began at the screen edge dismisses. */
  const fromEdge = useSharedValue(false);

  // A different hug reuses this component, so the last drag must not linger.
  useEffect(() => {
    dragX.value = 0;
  }, [hug.id, dragX]);

  const swipeBack = Gesture.Pan()
    // Only touches that start in the left edge strip can begin this gesture.
    // This detector wraps the whole overlay, and `fromEdge` below is only
    // consulted in onBegin — by which point the gesture has already joined the
    // arena and is competing with the card's pan and the thread's scrolling,
    // which it wins. Restricting where it can start keeps it out of that
    // contest entirely for every touch that isn't an edge swipe.
    .hitSlop({ left: 0, width: EDGE_WIDTH })
    // Rightward intent only, so vertical scrolling in the thread still works.
    .activeOffsetX([15, 9999])
    .failOffsetY([-25, 25])
    .onBegin((e) => {
      fromEdge.value = e.absoluteX <= EDGE_WIDTH;
    })
    .onUpdate((e) => {
      if (!fromEdge.value) return;
      dragX.value = Math.max(0, e.translationX);
    })
    .onEnd((e) => {
      if (!fromEdge.value) return;

      const leaving =
        e.translationX > DISMISS_DISTANCE || e.velocityX > DISMISS_VELOCITY;

      if (leaving) {
        // Closing unmounts this component, so it waits for the slide to land.
        dragX.value = withTiming(screenW, { duration: 120 }, (finished) => {
          if (finished) scheduleOnRN(onClose);
        });
      } else {
        dragX.value = withSpring(0);
      }
    });

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }],
  }));

  if (!hug) return null;

  console.log("HUGVIEWOVERLAY fromId: ", hug.from);
  console.log("HUGVIEWOVERLAY hugId: ", hug.id);

  if (opened || startsOpen) {
    return (
      <GestureDetector gesture={swipeBack}>
        <Animated.View style={[styles.fill, swipeStyle]}>
          <HugRevealerImage
            imageUri={hug.imagePath}
            message={hug.note}
            backgroundColor={hug.backgroundColor}
            loading={false}
            // The card yields room, and drops onto the thread, the moment there
            // is one to read.
            bottomInset={thread.length > 0 ? FOOTER_HEIGHT : BARE_FOOTER_HEIGHT}
            cardAnchor={thread.length > 0 ? "bottom" : "center"}
          />

          {/* Who sent it, when, and the way out. Sits above the card rather
            than inside the revealer, which owns only the card itself. */}
          <View
            style={[styles.header, { paddingTop: insets.top + spacing.lg }]}
            pointerEvents="box-none"
          >
            <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.plumInk} />
            </Pressable>

            <Pressable
              onPress={openMemoryLane}
              style={({ pressed }) => [
                styles.headerIdentity,
                pressed && styles.headerIdentityPressed,
              ]}
              hitSlop={8}
            >
              <FriendAvatar
                name={isSender ? recipientName : senderName}
                uid={isSender ? hug.to : hug.from}
                size={56}
              />

              <View style={styles.headerText}>
                <Text style={[styles.headerTitle, { color: headerInk }]}>
                  {isSender
                    ? `you hugged ${recipientName}`
                    : `${senderName} hugged you`}
                </Text>
                {sentAt && (
                  <Text style={[styles.headerTime, { color: headerInk }]}>
                    {formatTimestamp(sentAt)}
                  </Text>
                )}
              </View>
            </Pressable>
          </View>

          {/* Everything below the card: the note stacks on the buttons rather
            than floating over them at its own absolute offset. */}
          <View style={styles.footer} pointerEvents="box-none">
            <LinearGradient
              colors={[
                "rgba(246,243,251,0.85)",
                "rgba(246,243,251,0)",
                colors.mistBg,
              ]}
              locations={[0, 1]}
              pointerEvents="none"
            />
            <HugBackThread hug={hug} myUid={myUid} />

            {/* Whose move it is. A button on my turn; otherwise a line saying
              why there isn't one, so a closed thread doesn't just go blank. */}
            {myTurn ? (
              <View style={styles.buttonRow}>
                <PlushButton
                  variant="blush"
                  label={thread.length === 0 ? "hug back" : "answer"}
                  onPress={handleHugBack}
                />
                <Pressable onPress={() => setInfoTopic("limit")} hitSlop={8}>
                  <Text style={styles.turnsLeft}>
                    {turnsLeft === 1 ? "1 left" : `${turnsLeft} left`}
                  </Text>
                </Pressable>
              </View>
            ) : (
              thread.length > 0 &&
              turnsLeft !== 0 && (
                <Pressable
                  onPress={() => setInfoTopic("turn")}
                  hitSlop={8}
                  style={styles.turnHintPress}
                >
                  <Text style={[styles.turnsLeft, styles.turnHint]}>
                    {`${otherName}'s turn`}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          <ConfirmationModal
            isVisible={infoTopic !== null}
            title="hug backs"
            confirmButtonLabel="ok"
            onConfirm={() => setInfoTopic(null)}
            onRequestClose={() => setInfoTopic(null)}
          >
            <Text style={styles.modalBody}>
              {infoTopic === "turn"
                ? `you can only write back when ${otherName} writes you`
                : "you can hug back each other 3 times inside a hug!"}
            </Text>
          </ConfirmationModal>

          <Toast
            visible={confirmVisible}
            message={
              latest?.from === myUid
                ? `you hugged ${otherName} back`
                : `${otherName} hugged you back`
            }
            onHide={() => setConfirmVisible(false)}
            icon="heart-circle-outline"
          />
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <View style={styles.fill}>
      <LinearGradient colors={SEALED_BG} style={StyleSheet.absoluteFill} />

      <View style={styles.center}>
        {/* <Envelope /> */}
        <HugFaceSeal
          fromUid={hug.from}
          fromAvatar={hug.fromAvatar}
          size={160}
        />

        <Text style={styles.fromName}>{senderName} sent you a hug!</Text>

        <PlushButton
          variant="blush"
          label="open it"
          onPress={() => {
            setOpened(true);
            onOpen();
          }}
        />
      </View>

      <Pressable style={styles.dismiss} onPress={onIgnore} hitSlop={12}>
        <Text style={styles.dismissTxt}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
  // A fixed band pinned to the bottom. The thread fills everything above the
  // action row — starting under the postcard, growing downward, scrolling once
  // full — so the button keeps its place however many turns a hug collects.
  footer: {
    position: "absolute",
    height: FOOTER_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    zIndex: 30,
    flexDirection: "column",
    // Only matters when there is no thread yet: the lone button stays at the
    // bottom instead of floating in the middle of the band.
    justifyContent: "flex-end",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: "rgba(244, 242, 255, 0.20)",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Avatar and title are one target: tapping either opens the memory lane
  // with whoever is on the other end of this hug.
  headerIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerIdentityPressed: { opacity: 0.6 },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontFamily: font.displayBold,
    fontSize: 20,
  },
  headerTime: {
    fontFamily: font.ui,
    fontSize: 14,
    opacity: 0.65,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  // Both hints sit on the sender's backdrop and its heart pattern, so they
  // carry their own surface rather than relying on whatever is behind them.
  turnsLeft: {
    fontFamily: font.ui,
    fontSize: 13,
    color: colors.plumInk,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    // iOS clips a Text background to the border radius only with this set.
    overflow: "hidden",
  },
  turnHint: {
    textAlign: "center",
  },
  // The pill sizes to its text; the Pressable centres it in the footer row.
  turnHintPress: {
    alignSelf: "center",
  },
  modalBody: {
    fontFamily: font.ui,
    fontSize: 16,
    lineHeight: 22,
    color: colors.softInk,
    textAlign: "center",
  },
  hugBackMessage: {
    marginHorizontal: 35,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "85%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.mistBg,
    bottom: 50,
    ...shadow,
  },
  hugBackMessageText: {
    flexShrink: 1,
    fontFamily: font.uiBold,
    fontSize: 15,
    color: colors.plumInk,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 22,
    flexDirection: "column",
  },

  fromName: {
    fontFamily: "Caveat_400Regular",
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    top: 0,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  chipTxt: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  openBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  openTxt: { color: "#6D54B5", fontSize: 17, fontWeight: "700" },
  dismiss: {
    position: "absolute",
    top: 56,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  dismissTxt: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
