import { Friend } from "@/app/(tabs)/friends";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

interface HugNoteModalProps {
  visible: boolean;
  friendName: string;
  friendUid: string;
  onContinue: (note: string, friendName: string, friendUid: string) => void;
  onCancel: () => void;
}

export default function HugNoteModal({
  visible,
  friendName,
  friendUid,
  onContinue,
  onCancel,
}: HugNoteModalProps) {
  const [note, setNote] = useState("");
  const maxLength = 256;

  const handleContinue = () => {
    onContinue(friendName, friendUid, note.trim());
    setNote(""); // Clear for next time
  };

  const handleCancel = () => {
    setNote(""); // Clear on cancel
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>💌</Text>
            <Text style={styles.title}>Send a Hug</Text>
            <Text style={styles.subtitle}>to @{friendName}</Text>
          </View>

          {/* Note Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Add a note (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Write something nice..."
              placeholderTextColor="#999"
              value={note}
              onChangeText={setNote}
              multiline={true}
              maxLength={maxLength}
              textAlignVertical="top"
              autoFocus={true}
            />
            <View style={styles.characterCount}>
              <Text style={styles.characterCountText}>
                {note.length} / {maxLength}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#FAFAFA",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 400,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#FFE8E8",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: "#1A1A1A",
    minHeight: 120,
    maxHeight: 200,
  },
  characterCount: {
    alignItems: "flex-end",
    marginTop: 8,
  },
  characterCountText: {
    fontSize: 12,
    color: "#999",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
  },
  continueButton: {
    backgroundColor: "#FF6B6B",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
});
