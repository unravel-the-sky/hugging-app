import { DriftingAvatars } from "@/components/landing/DriftingAvatars";
import {
  ReleaseNotesModal,
  VersionBadge,
} from "@/components/landing/ReleaseNotes";
import { AppText } from "@/components/ui/AppText";
import { Logo } from "@/components/ui/Logo";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { Tiltable } from "@/components/ui/Tiltable";
import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { colors, font, spacing } from "../../components/ui/squish/theme";
import { APP_NAME } from "@/constants";

const TAB_BAR_HEIGHT = 52;
/** Home indicator. Read once at startup, so it is available synchronously. */
const BOTTOM_INSET = initialWindowMetrics?.insets.bottom ?? 0;

export default function HomeScreen() {
  // Opened on demand from the version badge, never on its own.
  const [showRelease, setShowRelease] = useState(false);

  const handleInitiateHug = () => {
    console.log("send to friends here");
    // navigate, not push: this is a tab switch, so it should go through the
    // tab router rather than reading as a stack push.
    router.navigate({
      pathname: "/(tabs)/friends",
    });
  };

  return (
    // `bottom` is deliberately not an edge here: that inset is the one that
    // lands late. actionsContainer clears the tab bar with constants instead.
    <SafeAreaView edges={["top"]} style={styles.overlay}>
      <DriftingAvatars count={5} intensity={90} />
      <View style={styles.page}>
        <View style={styles.titleRow}>
          <AppText variant="title">{APP_NAME}</AppText>
          <Text style={styles.titleDash}>—</Text>
          <VersionBadge onPress={() => setShowRelease(true)} />
        </View>
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
      <ReleaseNotesModal
        isVisible={showRelease}
        onClose={() => setShowRelease(false)}
      />
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
    justifyContent: "space-around",
    paddingVertical: spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  titleDash: {
    fontFamily: font.display,
    fontSize: 20,
    color: colors.softInk,
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
