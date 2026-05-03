import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface HugNoteModalProps {
  visible: boolean;
  friendName: string;
  friendUid: string;
  onContinue: (friendName: string, friendUid: string, note: string) => void;
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
    setNote("");
  };

  const handleCancel = () => {
    setNote("");
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.emoji}>💌</Text>
          <Text style={styles.title}>Send a Hug</Text>
          <Text style={styles.subtitle}>to @{friendName}</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Add a note (optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Write something nice..."
            placeholderTextColor="#999"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={maxLength}
            textAlignVertical="top"
          />
          <Text style={styles.characterCountText}>
            {note.length} / {maxLength}
          </Text>
        </View>

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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    height: "auto",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  inputContainer: {
    flex: 1,
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
    minHeight: 80,
  },
  characterCountText: {
    fontSize: 12,
    color: "#999",
    alignSelf: "flex-end",
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  continueButton: {
    backgroundColor: "#FF6B6B",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
});
