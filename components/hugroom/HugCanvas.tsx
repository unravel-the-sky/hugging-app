import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Particles from "@/components/hugroom/Particles";
import {
  isTogether,
  writeTouch,
  TOUCH_MIN_INTERVAL_MS,
  type ParticipantSlot,
  type TouchPoint,
} from "@/lib/hugroom";
import { colors, font, spacing } from "@/components/ui/squish/theme";

const ORB_SIZE = 60;
/** How long the remote orb takes to glide to each new position it receives. */
const REMOTE_SMOOTHING_MS = 60;

export function HugCanvas({
  code,
  mySlot,
  myTouch,
  theirTouch,
  theirName,
}: {
  code: string;
  mySlot: ParticipantSlot;
  myTouch?: TouchPoint | null;
  theirTouch?: TouchPoint | null;
  theirName: string;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Local echo of my own finger. Rendering my orb from RTDB would put a round
  // trip between my finger and the thing following it.
  const [localTouch, setLocalTouch] = useState<{ x: number; y: number } | null>(
    null,
  );

  const lastSentAt = useRef(0);
  const pendingPoint = useRef<{ x: number; y: number } | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flush = useCallback(() => {
    flushTimer.current = undefined;
    const point = pendingPoint.current;
    if (!point) return;
    pendingPoint.current = null;
    lastSentAt.current = Date.now();
    writeTouch(code, mySlot, point).catch(() => {});
  }, [code, mySlot]);

  /** Leading-edge throttle: the first move goes out immediately, the rest coalesce. */
  const queue = useCallback(
    (point: { x: number; y: number }) => {
      pendingPoint.current = point;
      const wait = TOUCH_MIN_INTERVAL_MS - (Date.now() - lastSentAt.current);
      if (wait <= 0) flush();
      else if (!flushTimer.current)
        flushTimer.current = setTimeout(flush, wait);
    },
    [flush],
  );

  const track = (e: GestureResponderEvent) => {
    if (!size.width || !size.height) return;
    const point = {
      x: e.nativeEvent.locationX / size.width,
      y: e.nativeEvent.locationY / size.height,
    };
    setLocalTouch(point);
    queue(point);
  };

  const release = () => {
    clearTimeout(flushTimer.current);
    flushTimer.current = undefined;
    pendingPoint.current = null;
    lastSentAt.current = 0;
    setLocalTouch(null);
    writeTouch(code, mySlot, null).catch(() => {});
  };

  // Don't strand a touch in the database if the screen goes away mid-press.
  useEffect(() => {
    return () => {
      clearTimeout(flushTimer.current);
      writeTouch(code, mySlot, null).catch(() => {});
    };
  }, [code, mySlot]);

  const mine = localTouch ?? myTouch ?? null;
  const together = useMemo(
    () => isTogether(mine ? { ...mine, at: 0 } : null, theirTouch),
    [mine, theirTouch],
  );

  // When they meet, one orb at the midpoint instead of two near-overlapping ones.
  const meeting =
    together && mine && theirTouch
      ? { x: (mine.x + theirTouch.x) / 2, y: (mine.y + theirTouch.y) / 2 }
      : null;

  return (
    <View
      style={styles.canvas}
      onLayout={(e: LayoutChangeEvent) => setSize(e.nativeEvent.layout)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={track}
      onResponderMove={track}
      onResponderRelease={release}
      onResponderTerminate={release}
    >
      {meeting ? (
        <Orb
          point={meeting}
          size={size}
          together
          label={null}
          smoothing={REMOTE_SMOOTHING_MS}
        />
      ) : (
        <>
          <Orb
            point={theirTouch}
            size={size}
            label={theirName}
            smoothing={REMOTE_SMOOTHING_MS}
          />
          <Orb point={mine} size={size} label={null} smoothing={0} />
        </>
      )}

      <Text style={styles.hint}>
        {together
          ? "you're holding on together"
          : theirTouch
            ? `${theirName} is glowing somewhere — catch them`
            : mine
              ? `waiting for ${theirName} to find you`
              : "touch anywhere"}
      </Text>
    </View>
  );
}

function Orb({
  point,
  size,
  label,
  together = false,
  smoothing,
}: {
  point: { x: number; y: number } | null | undefined;
  size: { width: number; height: number };
  label: string | null;
  together?: boolean;
  smoothing: number;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const placed = useRef(false);

  useEffect(() => {
    if (!point || !size.width) {
      opacity.value = withTiming(0, { duration: 220 });
      scale.value = withTiming(0.4, { duration: 220 });
      placed.current = false;
      return;
    }

    const px = point.x * size.width - ORB_SIZE / 2;
    const py = point.y * size.height - ORB_SIZE / 2;

    // First appearance snaps into place; later updates glide, so a remote orb
    // arriving at ~14 Hz doesn't stutter across the screen.
    if (!placed.current || smoothing === 0) {
      x.value = px;
      y.value = py;
      placed.current = true;
    } else {
      x.value = withTiming(px, { duration: smoothing });
      y.value = withTiming(py, { duration: smoothing });
    }

    opacity.value = withTiming(1, { duration: 160 });
    scale.value = withSpring(together ? 1.6 : 1, {
      damping: 12,
      stiffness: 140,
    });
  }, [point?.x, point?.y, size.width, size.height, together, smoothing]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.orbWrap, style]} pointerEvents="none">
      <View style={[styles.orb, together && styles.orbTogether]} />
      {/* <Particles active={!!point} kind={together ? "heart" : "star"} /> */}
      {/* {label && point ? <Text style={styles.orbLabel}>{label}</Text> : null} */}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    alignSelf: "stretch",
  },
  orbWrap: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: colors.butter,
    shadowColor: colors.butter,
    shadowOpacity: 0.9,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  orbTogether: { backgroundColor: colors.blush, shadowColor: colors.blush },
  orbLabel: {
    position: "absolute",
    top: ORB_SIZE + 6,
    fontFamily: font.ui,
    fontSize: 15,
    color: colors.surface,
  },
  hint: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: spacing.xl,
    textAlign: "center",
    fontFamily: font.hand,
    fontSize: 22,
    color: colors.soft,
  },
});
