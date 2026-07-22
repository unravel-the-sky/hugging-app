import { useAvatarThumb } from "@/hooks/useAvatarThumbnail";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useGetDownloadUrl } from "@/hooks/useGetDownloadUrl";
import { useHugTexture } from "@/hooks/useHugTexture";
import { db } from "@/lib/firebaseConfig";
import { Hug } from "@/lib/handleHugs";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AvatarImage from "../avatar/AvatarImage";
import { colors, font, radius, shadow } from "../ui/squish";
import { PlushButton } from "../ui/squish/PlushButton";
import Toast from "../ui/squish/Toast";
import { HugFaceSeal } from "./HugFaceSeal";
import HugRevealer from "./HugRevealerNEW";

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

// Stylized envelope built from Views (no extra deps). Swap for your own
// asset/SVG if you have one.
function Envelope() {
  return (
    <View style={env.wrap}>
      <View style={env.body} />
      <View style={env.flap} />
      <View style={env.badge}>
        <Text style={env.heart}>♥</Text>
      </View>
    </View>
  );
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
  const { downloadUrl, failed } = useGetDownloadUrl(hug?.imagePath);
  const { loaded, loading } = useHugTexture(downloadUrl || "");

  const [hugBackNote, setHugBackNote] = useState<string | null>(
    hug.hugBackNote ?? null,
  );
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [alreadyHugged, setAlreadyHugged] = useState(false);

  const { user } = useCurrentUser();

  // Reset to sealed whenever a different hug is opened.
  useEffect(() => {
    setOpened(false);
  }, [hug?.id]);

  useEffect(() => {
    return onSnapshot(doc(db, "hugs", hug.id), (snap) => {
      const next = snap.data()?.hugBackNote as string | undefined;
      if (next && next !== hugBackNote) {
        setHugBackNote(next);
        setConfirmVisible(true);
        setTimeout(() => setConfirmVisible(false), 25000);
      }
    });
  }, [hug.id, hugBackNote]);

  const handleHugBack = () => {
    if (hugBackNote) {
      setAlreadyHugged(true);
      return;
    }
    router.push({
      pathname: "/hug-back",
      params: { hugId: hug.id, toName: hug.fromName },
    });
  };

  const avatarThumbUrl = useAvatarThumb(hug.from);
  const isPhoto = hug.fromAvatar === "photo" && !!avatarThumbUrl;
  const { loaded: avatarTex } = useHugTexture(avatarThumbUrl || undefined);

  if (!hug) return null;

  console.log("HUGVIEWOVERLAY fromName: ", hug.fromName);

  if (opened || isReadOnly) {
    return (
      <>
        <HugRevealer
          loaded={loaded}
          hasImage={!!hug.imagePath}
          message={hug.note}
          isReadOnly={isReadOnly}
          onHugBack={handleHugBack}
          huggedBack={!!hugBackNote}
          onClose={onClose}
          loading={loading}
        />

        {hugBackNote && loaded && (
          <View style={styles.hugBackMessage}>
            <Text style={styles.hugBackMessageText}>{hugBackNote}</Text>
            <AvatarImage avatar={user?.avatar || "male"} size="s" />
          </View>
        )}

        <Toast
          visible={confirmVisible}
          message={`you hugged ${hug.fromName} back`}
          onHide={() => console.log("ha deeet")}
          icon="heart-circle-outline"
        />

        <Toast
          visible={alreadyHugged}
          message={`you already hugged ${hug.fromName} back`!}
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
        {/* {isPhoto && avatarThumbUrl && (
          <FiberCanvas style={styles.fill}>
            <ambientLight intensity={0.75} color="#fff3ea" />
            <directionalLight position={[-1.4, 2, 2.2]} intensity={0.9} />
            <pointLight
              position={[1.5, -0.5, 2.5]}
              intensity={0.5}
              color="#ffe8d6"
            />
            <HugArms map={avatarTex?.texture ?? null} autoPlay />
          </FiberCanvas>
        )} */}

        <Text style={styles.fromName}>
          {hug.fromName ?? "Someone"} sent you a hug!
        </Text>

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
    bottom: 200,
    alignSelf: "flex-end",
    marginRight: 35,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: colors.mistBg,
    zIndex: 30,
    ...shadow,
  },
  hugBackMessageText: {
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

const env = StyleSheet.create({
  wrap: { width: BODY_W, height: BODY_H },
  body: {
    position: "absolute",
    inset: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    shadowColor: "#5A3FA0",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    overflow: "hidden",
  },
  // downward triangle = envelope flap
  flap: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: BODY_W / 2,
    borderRightWidth: BODY_W / 2,
    borderTopWidth: FLAP_H,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#E4D7F7",
  },
  badge: {
    position: "absolute",
    alignSelf: "center",
    top: BODY_H / 2 - 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF7DA8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF7DA8",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  heart: { color: "#FFFFFF", fontSize: 24 },
});
