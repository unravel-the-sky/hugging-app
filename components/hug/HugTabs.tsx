import { useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors } from "../ui/squish/theme";

type Tab = "incoming" | "outgoing";

const TABS: { value: Tab; label: string }[] = [
  { value: "incoming", label: "Received" },
  { value: "outgoing", label: "Sent" },
];

const TRACK_PADDING = 4;

export function HugTabs({
  value,
  onChange,
}: {
  value: Tab;
  onChange: (tab: Tab) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const segmentWidth =
    trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / TABS.length : 0;
  const activeIndex = TABS.findIndex((t) => t.value === value);

  const translateX = useSharedValue(0);
  const isFirst = useRef(true);

  useEffect(() => {
    if (segmentWidth === 0) return;
    const target = activeIndex * segmentWidth;
    if (isFirst.current) {
      translateX.value = target; // no slide on first layout
      isFirst.current = false;
    } else {
      translateX.value = withSpring(target, { damping: 36, stiffness: 180 });
    }
  }, [activeIndex, segmentWidth, translateX]);

  const pillStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) =>
        setTrackWidth(e.nativeEvent.layout.width)
      }
    >
      {segmentWidth > 0 && <Animated.View style={[styles.pill, pillStyle]} />}
      {TABS.map((t) => {
        const active = t.value === value;
        return (
          <Pressable
            key={t.value}
            style={styles.segment}
            onPress={() => onChange(t.value)}
            hitSlop={8}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: colors.mistBg, // soft lavender track
    borderRadius: 18,
    padding: TRACK_PADDING,
    marginHorizontal: 16,
    marginTop: 12,
  },
  pill: {
    position: "absolute",
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    // soft plush shadow
    shadowColor: "#6C5CE7",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9B96B5", // muted lavender-grey
  },
  labelActive: {
    color: "#6C5CE7", // your purple accent
  },
});
