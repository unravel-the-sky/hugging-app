import { colors, font, spacing } from "@/components/ui/squish/theme";
import { StyleSheet, Text, View } from "react-native";

export const HugsEmptyState = ({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) => (
  <View style={styles.container}>
    <Text style={styles.emoji}>🤗</Text>
    <Text style={styles.title}>{title}</Text>
    {hint && <Text style={styles.hint}>{hint}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: spacing.xl * 2,
  },
  emoji: { fontSize: 80, marginBottom: 16 },
  title: {
    fontFamily: font.displayBold,
    fontSize: 24,
    color: colors.plumInk,
    marginBottom: 8,
    textAlign: "center",
  },
  hint: {
    fontFamily: font.ui,
    fontSize: 15,
    color: colors.softInk,
    textAlign: "center",
  },
});
