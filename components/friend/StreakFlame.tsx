import { colors, darken, font, radius, tint } from "@/components/ui/squish";
import { ResolvedStreak } from "@/lib/hugs/streaks";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

/**
 * The little "🔥 4" chip next to a friend's name.
 *
 * Renders nothing without a live streak — a friend you hug irregularly should
 * look no worse than one you have never had a streak with. Turns amber and
 * swaps the flame for an hourglass in the last hours before the streak
 * lapses, which is the only moment the badge is asking for anything.
 */
export const StreakFlame = ({
  streak,
  size = 13,
}: {
  streak: ResolvedStreak;
  size?: number;
}) => {
  if (!streak.days) return null;

  const urgent = streak.isExpiring;
  const tone = urgent ? colors.peach : colors.butter;

  return (
    <View style={[styles.chip, { backgroundColor: tint(tone, 0.78) }]}>
      <Ionicons
        name={urgent ? "hourglass" : "flame"}
        size={size}
        color={darken(tone, 0.34)}
      />
      <Text style={[styles.days, { fontSize: size, color: darken(tone, 0.44) }]}>
        {streak.days}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  days: { fontFamily: font.displayBold },
});
