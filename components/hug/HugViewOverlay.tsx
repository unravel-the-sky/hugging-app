import { Hug } from "@/lib/handleHugs";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AvatarImage from "../avatar/AvatarImage";

interface HugViewOverlayProps {
  visible: boolean;
  hug: Hug | undefined;
  onHugBack: (hug: Hug) => void;
  onIgnore: (hugId: string) => void;
}

const avatarEmojis = {
  male: "👨",
  female: "👩",
};

export default function HugViewOverlay({
  visible,
  hug,
  onHugBack,
  onIgnore,
}: HugViewOverlayProps) {
  if (!hug) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Avatar bit */}
          <View style={styles.titleContainer}>
            {/* <Text style={styles.fromName}>@{hug.fromName}</Text> */}
            <AvatarImage avatar={hug.fromAvatar} />
            <Text style={styles.title}>sent you a hug.. 👉👈</Text>
          </View>

          {/* Note Section */}
          {hug.note && (
            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>{hug.note}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.hugBackButton]}
              onPress={() => onHugBack(hug)}
            >
              <Text style={styles.hugBackText}>Hug Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.ignoreButton]}
              onPress={() => onIgnore(hug.id)}
            >
              <Text style={styles.ignoreText}>Ignore</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
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
    alignItems: "center",
    position: "relative",
  },
  titleContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    // backgroundColor: "green",
  },
  title: {
    marginTop: 6,
    fontSize: 16,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarEmoji: {
    fontSize: 72,
  },
  fromName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  hugLabel: {
    fontSize: 16,
    color: "#666",
  },
  noteContainer: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    margin: 16,
    borderWidth: 2,
    borderColor: "#FFE8E8",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  noteText: {
    fontSize: 16,
    color: "#1A1A1A",
    lineHeight: 24,
    textAlign: "center",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  actionButton: {
    flex: 1,
    aspectRatio: 1.8,
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
    backgroundColor: "#FF6B6B",
  },
  hugBackEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  hugBackText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
  ignoreButton: {
    backgroundColor: "#F0F0F0",
  },
  ignoreEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  ignoreText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
  },
});
