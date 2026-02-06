import { Pressable, StyleSheet } from "react-native";
import { AppText } from "./AppText";

type AppButtonProps = {
  onPress: () => void;
  buttonText: string;
  disabled?: boolean;
};

export function AppButton({ buttonText, onPress, disabled }: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        styles.hugBackButton,
        pressed && styles.buttonPressed,
      ]}
    >
      <AppText style={styles.hugBackText}>{buttonText}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    aspectRatio: 4,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  hugBackButton: {
    backgroundColor: "#ffbf6b",
    borderColor: "#d19b53",
    borderWidth: 5,
    borderStyle: "dashed",
  },
  buttonPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    elevation: 1,
  },
  hugBackEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  hugBackText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
