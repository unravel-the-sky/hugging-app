import React from "react";
import { Modal, StyleSheet, View, Text } from "react-native";
import { colors, font, radius, shadow, spacing } from "./squish";
import { PlushButton } from "@/components/ui/squish/PlushButton";

type ConfirmationModalProps = {
  isVisible: boolean;
  title: string;
  confirmButtonLabel: string;
  cancelButtonLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onRequestClose: () => void;
};

export const ConfirmationModal = ({
  isVisible,
  title,
  children,
  disabled,
  confirmButtonLabel,
  cancelButtonLabel,
  onCancel,
  onConfirm,
  onRequestClose,
}: ConfirmationModalProps) => {
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{title}</Text>

          <>{children}</>

          <View style={styles.actions}>
            <PlushButton
              label={cancelButtonLabel}
              variant="soft"
              onPress={onCancel}
              disabled={disabled}
              style={styles.actionBtn}
            />
            <PlushButton
              label={confirmButtonLabel}
              variant="blush"
              onPress={onConfirm}
              disabled={disabled}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(74, 66, 104, 0.45)",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadow,
  },
  sheetTitle: {
    fontSize: 22,
    fontFamily: font.displayBold,
    color: colors.plumInk,
    textAlign: "center",
  },
  sheetBody: {
    fontSize: 16,
    fontFamily: font.ui,
    color: colors.softInk,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: { flexDirection: "row", gap: spacing.md },
  actionBtn: { flex: 1 },
});
