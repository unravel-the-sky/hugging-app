import { Text, TextProps, StyleSheet } from "react-native";

export type TextVariant = "title" | "body" | "small";

export function AppText({
  variant = "body",
  style,
  ...props
}: TextProps & { variant?: TextVariant }) {
  return <Text {...props} style={[styles.base, styles[variant], style]} />;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: "SpaceMono",
    color: "#111",
  },
  title: {
    fontSize: 26,
  },
  body: {
    fontSize: 18,
  },
  small: {
    fontSize: 14,
  },
});
