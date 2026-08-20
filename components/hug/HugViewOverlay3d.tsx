import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Hug } from "@/lib/handleHugs";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font, radius, shadow, spacing } from "../ui/squish";
import { FriendAvatar } from "../ui/squish/FriendAvatar";
import { PlushButton } from "../ui/squish/PlushButton";
import Toast from "../ui/squish/Toast";
import { HugFaceSeal } from "./HugFaceSeal";
import HugRevealerImage from "./HugRevealerImage";

// Lavender gradient from the "Sealed (before)" screen.
const SEALED_BG = ["#ddd6ef", "#d3cfdb"] as const;

interface HugViewOverlayProps {
  hug: Hug;
  isReadOnly?: boolean;
  onHugBack?: (hug: Hug) => void;
  onOpen: () => void;
  onClose: () => void;
  onIgnore: () => void;
}

export default function HugViewOverlay({
  hug,
  isReadOnly,
  onHugBack,
  onOpen,
  onClose,
  onIgnore,
}: HugViewOverlayProps) {
  const [opened, setOpened] = useState(false);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [alreadyHugged, setAlreadyHugged] = useState(false);

  const { user } = useCurrentUser();
  const insets = useSafeAreaInsets();

  const senderName = hug.fromName ?? "Someone";
  const recipientName = hug.toName ?? "Someone";

  // The hug arrives live from the hugs stream, so a hug-back written on the
  // /hug-back screen shows up here as a prop change.
  const hugBackNote = hug.hugBackNote ?? null;

  // Whatever the note was when this hug was first shown; anything past that is
  // a hug-back that landed while the overlay was open, and gets confirmed once.
  const seenNote = useRef(hugBackNote);

  // Reset to sealed whenever a different hug is opened. Declared before the
  // effect below so the new hug's note counts as already seen, not as new.
  useEffect(() => {
    setOpened(false);
    seenNote.current = hug?.hugBackNote ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hug.id]);

  useEffect(() => {
    const isNew = !!hugBackNote && !seenNote.current;
    seenNote.current = hugBackNote;
    if (!isNew) return;

    setConfirmVisible(true);
    const timer = setTimeout(() => setConfirmVisible(false), 25000);
    return () => clearTimeout(timer);
  }, [hugBackNote]);

  const handleHugBack = () => {
    if (hugBackNote) {
      setAlreadyHugged(true);
      return;
    }
    router.push({
      pathname: "/hug-back",
      params: { hugId: hug.id, toName: senderName },
    });
  };

  if (!hug) return null;

  console.log("HUGVIEWOVERLAY fromId: ", hug.from);
  const isSender = hug.from === user?.uid;

  if (opened || isReadOnly) {
    return (
      <>
        <HugRevealerImage
          imageUri={hug.imagePath}
          message={hug.note}
          isReadOnly={isReadOnly}
          onHugBack={handleHugBack}
          huggedBack={!!hugBackNote}
          onClose={onClose}
          loading={false}
        />

        {hugBackNote && (
          <View
            style={[
              styles.hugBackMessage,
              {
                bottom: insets.bottom + 110,
                alignSelf: isSender ? "flex-start" : "flex-end",
                flexDirection: isSender ? "row-reverse" : "row",
              },
            ]}
          >
            <Text style={styles.hugBackMessageText}>{hugBackNote}</Text>
            <FriendAvatar
              name={isSender ? recipientName : senderName}
              uid={isSender ? hug.to : user?.uid}
              size={40}
            />
          </View>
        )}

        {!isReadOnly && (
          <Toast
            visible={confirmVisible}
            message={`you hugged ${senderName} back`}
            onHide={() => console.log("ha deeet")}
            icon="heart-circle-outline"
          />
        )}

        <Toast
          visible={alreadyHugged}
          message={`you already hugged ${senderName} back`!}
          onHide={() => setAlreadyHugged(false)}
        />
      </>
    );
  }

  return (
    <View style={styles.fill}>
      <LinearGradient colors={SEALED_BG} style={StyleSheet.absoluteFill} />

      <View style={styles.center}>
        {/* <Envelope /> */}
        <HugFaceSeal
          fromUid={hug.from}
          fromAvatar={hug.fromAvatar}
          size={150}
        />

        <Text style={styles.fromName}>{senderName} sent you a hug!</Text>

        <PlushButton
          variant="blush"
          label="open it"
          onPress={() => {
            setOpened(true);
            onOpen();
          }}
        />
      </View>

      <Pressable style={styles.dismiss} onPress={onIgnore} hitSlop={12}>
        <Text style={styles.dismissTxt}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
  hugBackMessage: {
    position: "absolute",
    // alignSelf: "flex-end",
    // marginRight: 35,
    marginHorizontal: 35,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "85%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.mistBg,
    zIndex: 30,
    ...shadow,
  },
  hugBackMessageText: {
    flexShrink: 1,
    fontFamily: font.uiBold,
    fontSize: 15,
    color: colors.plumInk,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 22,
    flexDirection: "column",
  },

  fromName: {
    fontFamily: "Caveat_400Regular",
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    top: 0,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  chipTxt: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  openBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  openTxt: { color: "#6D54B5", fontSize: 17, fontWeight: "700" },
  dismiss: {
    position: "absolute",
    top: 56,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  dismissTxt: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

const BODY_W = 220;
const BODY_H = 150;
const FLAP_H = 86;
