import { DriftingAvatars } from "@/components/landing/DriftingAvatars";
import { ReleaseNotes } from "@/components/landing/ReleaseNotes";
import { AppText } from "@/components/ui/AppText";
import { Logo } from "@/components/ui/Logo";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { Tiltable } from "@/components/ui/Tiltable";
import { useHugDraft } from "@/hooks/useHugDraft";
import { SendableHug } from "@/lib/handleHugs";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { colors, font, spacing } from "../../components/ui/squish/theme";

/**
 * The floating tab bar's own height.
 *
 * iOS derives a bottom safe-area inset from the tab bar and hands it down, but
 * it arrives a frame or more after the first layout — which is what threw the
 * button behind the tab bar on cold start and then snapped it up. There is no
 * hook to ask for it either: useBottomTabBarHeight belongs to
 * @react-navigation/bottom-tabs and throws under NativeTabs, which exposes no
 * equivalent. So the bottom edge is laid out from constants instead, and is
 * identical on the first frame and the last.
 *
 * If the button sits too high or clips the bar, this is the number to nudge.
 */
const TAB_BAR_HEIGHT = 52;
/** Home indicator. Read once at startup, so it is available synchronously. */
const BOTTOM_INSET = initialWindowMetrics?.insets.bottom ?? 0;

export default function HomeScreen() {
  const toUid = useHugDraft((s) => s.to);
  const toName = useHugDraft((s) => s.toName);
  const note = useHugDraft((s) => s.note);
  const imagePath = useHugDraft((s) => s.photoUri);
  const backgroundColor = useHugDraft((s) => s.backgroundColor);

  console.log("hello im index: ", { toUid, toName, note, imagePath });
  const [sendableHug, setSendableHug] = useState<SendableHug | undefined>(
    undefined,
  );
  const [hugIsSent, setHugIsSent] = useState(false);
  // Dismissal is deliberately not persisted — the notes come back on reload.
  const [showRelease, setShowRelease] = useState(true);

  useEffect(() => {
    if (toUid && toName) {
      setSendableHug({
        to: toUid,
        toName: toName,
        note,
        imagePath,
        backgroundColor,
      });
    }
  }, [backgroundColor, imagePath, note, toName, toUid]);

  const handleInitiateHug = () => {
    console.log("send to friends here");
    router.push({
      pathname: "/(tabs)/friends",
    });
  };

  const handleResetHug = () => {
    setHugIsSent(false);
    setSendableHug(undefined);
  };

  if (hugIsSent) {
    return (
      <View style={styles.emptyContainer}>
        <AppText style={styles.emptyTitle}>Welldone!!</AppText>
        <AppText style={styles.emptySubtitle}>
          You sent a hug to {sendableHug?.toName || "lol"}
        </AppText>
        <Pressable
          style={styles.addFriendButton}
          onPress={() => handleResetHug()}
        >
          <Text style={styles.addFriendButtonText}>Yay!</Text>
        </Pressable>
      </View>
    );
  }

  return (
    // `bottom` is deliberately not an edge here: that inset is the one that
    // lands late. actionsContainer clears the tab bar with constants instead.
    <SafeAreaView edges={["top"]} style={styles.overlay}>
      <DriftingAvatars count={5} intensity={90} />
      <View style={styles.page}>
        <AppText variant="title">Hugging app</AppText>
        <View style={styles.body}>
          <Text style={styles.mainText}>
            Do you feel like you need a hug? Or would you like to send a hug?
          </Text>
          <View style={styles.logoRow}>
            <Tiltable>
              <Logo />
            </Tiltable>
          </View>
          <Text style={styles.mainText}>
            Then click the button, choose a hugging friend and send some love!
          </Text>
          {showRelease && (
            <ReleaseNotes onClose={() => setShowRelease(false)} />
          )}
        </View>
        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <PlushButton
            onPress={handleInitiateHug}
            label="send a hug 🥹"
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // move this to an egen coponent later
  mainText: {
    fontFamily: font.ui,
    fontSize: 16,
    color: colors.plumInk,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: colors.lilac,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  addFriendButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addFriendButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.soft,
  },
  page: {
    flex: 1,
    width: "100%",
    padding: 20,
  },
  body: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
    paddingBottom: spacing.lg,
  },
  logoRow: {
    width: "100%",
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  containerText: {
    fontSize: 20,
  },
  actionsContainer: {
    width: "100%",
    paddingTop: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + BOTTOM_INSET,
  },
});
