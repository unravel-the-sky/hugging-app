import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import { colors, radius } from "./theme";

export default function RoundIconButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.roundBtn, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel="Back"
    >
      <Ionicons name={icon} size={22} color={colors.plumInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.deep,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
});
