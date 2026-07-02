import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import HugRevealer from "./HugRevealerNEW";
import { PlushButton } from "../ui/squish/PlushButton";
import { fixFirebaseUrl } from "./HugImage";
import { useHugTexture } from "@/hooks/useHugTexture";
import { Hug } from "@/lib/handleHugs";

// Lavender gradient from the "Sealed (before)" screen.
const SEALED_BG = ["#B9A5EC", "#9A7BD9"] as const;

interface Props {
  hug?: Hug | undefined;
  onHugBack: (hug: Hug) => void;
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
  onHugBack,
  onOpen,
  onClose,
  onIgnore,
}: Props) {
  const [opened, setOpened] = useState(false);
  const { loaded, loading } = useHugTexture(
    fixFirebaseUrl(hug?.imagePath || ""),
  );

  // Reset to sealed whenever a different hug is opened.
  useEffect(() => {
    setOpened(false);
  }, [hug?.id]);

  if (!hug) return null;

  if (opened) {
    return (
      <HugRevealer
        loaded={loaded}
        hasImage={!!hug.imagePath}
        message={hug.note}
        onHugBack={() => onHugBack(hug)}
        onClose={onClose}
        loading={loading}
      />
    );
  }

  return (
    <View style={styles.fill}>
      <LinearGradient colors={SEALED_BG} style={StyleSheet.absoluteFill} />

      <View style={styles.center}>
        <Envelope />

        <Text style={styles.fromName}>
          {hug.fromName ?? "Someone"} sent you a hug
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 22,
  },

  fromName: {
    fontFamily: "Caveat_400Regular",
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
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
