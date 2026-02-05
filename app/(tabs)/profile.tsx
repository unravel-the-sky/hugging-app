import AvatarImage from "@/components/avatar/AvatarImage";
import Loader from "@/components/ui/Loader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { updateUserAvatar } from "@/lib/createUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type AvatarType = "male" | "female";

interface AvatarOption {
  type: AvatarType;
  emoji: string;
  label: string;
}

const avatarOptions: AvatarOption[] = [
  { type: "male", emoji: "👨", label: "zhis" },
  { type: "female", emoji: "👩", label: "zhat" },
];

export default function ProfileScreen() {
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType>("male");
  const [isSaving, setIsSaving] = useState(false);

  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (user) {
      setSelectedAvatar(user.avatar || "male");
    }
  }, [user]);

  const handleSaveAvatar = async () => {
    setIsSaving(true);
    try {
      // await AsyncStorage.setItem("avatar", selectedAvatar);
      // // TODO: Update avatar in Firebase user object
      await updateUserAvatar(selectedAvatar);

      // Alert.alert("Success! ✨", "Your avatar has been updated!", [
      //   {
      //     text: "OK",
      //     // onPress: () => router.back(),
      //   },
      // ]);
    } catch (error) {
      console.error("Error saving avatar:", error);
      Alert.alert("Error", "Failed to save avatar. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("username");
            await AsyncStorage.removeItem("avatar");
            router.replace("/setup");
          } catch (error) {
            console.error("Error logging out:", error);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.currentAvatar}>
            <AvatarImage avatar={user?.avatar} />
          </View>
          <Text style={styles.username}>@{user?.displayName}</Text>
        </View>

        {/* Avatar Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Avatar</Text>
          <View style={styles.avatarGrid}>
            {avatarOptions.map((avatar) => (
              <TouchableOpacity
                key={avatar.type}
                style={[
                  styles.avatarOption,
                  selectedAvatar === avatar.type && styles.avatarOptionSelected,
                ]}
                onPress={() => setSelectedAvatar(avatar.type)}
              >
                <AvatarImage avatar={avatar.type} />
                <Text style={styles.avatarLabel}>{avatar.label}</Text>
                {selectedAvatar === avatar.type && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveAvatar}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? "Saving..." : "Save Avatar"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: "#1A1A1A",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    padding: 24,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  currentAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    // backgroundColor: "#ffaeae",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  currentAvatarEmoji: {
    fontSize: 60,
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  avatarGrid: {
    flexDirection: "row",
    gap: 16,
  },
  avatarOption: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    position: "relative",
  },
  avatarOptionSelected: {
    borderColor: "#FF6B6B",
    backgroundColor: "#FFE8E8",
  },
  avatarEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedBadgeText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 32,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: "#FFB3B3",
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  actionButtonText: {
    fontSize: 16,
    color: "#1A1A1A",
  },
  actionButtonIcon: {
    fontSize: 20,
    color: "#999",
  },
});
