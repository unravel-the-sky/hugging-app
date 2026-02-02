import { createUserWithUsername } from "@/lib/createUser";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface UsernameSetupProps {
  onUsernameSet: (userId: string, username: string) => void;
}

export default function UsernameSetup({ onUsernameSet }: UsernameSetupProps) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    // Validate username
    if (username.trim().length < 3) {
      Alert.alert("Too Short", "Username must be at least 3 characters long");
      return;
    }

    if (username.trim().length > 20) {
      Alert.alert("Too Long", "Username must be less than 20 characters");
      return;
    }

    // Check for valid characters (alphanumeric and underscore only)
    const validUsername = /^[a-zA-Z0-9_]+$/.test(username.trim());
    if (!validUsername) {
      Alert.alert(
        "Invalid Username",
        "Username can only contain letters, numbers, and underscores",
      );
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Check if username exists in Firebase here
      const trimmedUsername = username.trim().toLowerCase();
      const userId = await createUserWithUsername(trimmedUsername);
      onUsernameSet(userId, trimmedUsername);
    } catch (error: any) {
      if (error?.message === "USERNAME_TAKEN") {
        Alert.alert("Error", "Username taken! Try another one pls tenks");
      } else {
        console.error("Error saving username:", error);
      }
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🤗</Text>
        <Text style={styles.title}>Welcome to Hug</Text>
        <Text style={styles.subtitle}>Choose a username to get started</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="your_username"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          editable={!isLoading}
        />
        <Text style={styles.hint}>
          3-20 characters, letters, numbers and underscores only
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? "Setting up..." : "Continue"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1A1A1A",
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
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
});
