import { addFriendByUsername } from "@/lib/handleFriends";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddUserScreen() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddUser = async () => {
    if (username.trim().length < 3) {
      Alert.alert(
        "Invalid Username",
        "Username must be at least 3 characters long",
      );
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement Firebase user search and add logic here
      // For now, just simulate the process
      // await new Promise((resolve) => setTimeout(resolve, 1000));
      const res = await addFriendByUsername(username);
      if (!res) {
        Alert.alert("poop");
        return;
      }

      Alert.alert(
        "Success! 🎉",
        `Added @${username.trim()} to your contacts!`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );

      setUsername("");
    } catch (error) {
      Alert.alert("Error", "Failed to add user. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="person-add" size={64} color={"#7c7c7c"} />
        </View>

        <Text style={styles.title}>Add a Friend</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Search by username</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.atSymbol}>@</Text>
            <TextInput
              style={styles.input}
              placeholder="username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleAddUser}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Adding..." : "Add Friend"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  iconContainer: {
    alignItems: "center",
    padding: 20,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
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
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  atSymbol: {
    fontSize: 18,
    color: "#999",
    marginRight: 4,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "#1A1A1A",
  },
  button: {
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#FFB3B3",
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelButton: {
    marginTop: 8,
    padding: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#999",
    fontSize: 16,
  },
});
