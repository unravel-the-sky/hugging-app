import { Text, TextProps, StyleSheet } from "react-native";
import { colors, font } from "./squish";

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
    fontFamily: font.displayBold,
    fontSize: 34,
    color: colors.plumInk,
  },
  title: {
    fontSize: 34,
  },
  body: {
    fontSize: 18,
  },
  small: {
    fontSize: 14,
  },
});
