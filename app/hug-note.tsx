import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const maxLength = 256;

export default function HugNoteModal() {
  const { friendName, friendUid } = useLocalSearchParams<{
    friendName: string;
    friendUid: string;
  }>();

  const [note, setNote] = useState("");

  const handleContinue = () => {
    router.replace({
      pathname: "/(tabs)",
      params: {
        toUid: friendUid,
        toName: friendName,
        note: note.trim(),
      },
    });
  };

  const handleCancel = () => {
    router.back();
  };

  const handleAddPicture = () => {
    console.log("yay");
    router.replace({
      pathname: "/take-pic",
      params: {
        toUid: friendUid,
        toName: friendName,
        note: note.trim() || "",
      },
    });
  };

  return (
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

      <View>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleAddPicture}
        >
          <Text style={styles.cancelButtonText}>Send a postcard 📷 </Text>
        </TouchableOpacity>
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
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor: "#ffffff",
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    gap: 16,
  },
  currentAvatar: {
    alignSelf: "center",
    marginBottom: 16,
    width: 100,
    height: 100,
  },
  header: {
    alignItems: "center",
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
    // marginBottom: 24,
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
    maxHeight: 200,
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
