import { use, useEffect, useRef, useState, type RefObject } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFrame } from "@react-three/fiber";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as THREE from "three";

import { FiberCanvas } from "../three/FiberCanvas";
import { TiltRef, useTilt } from "@/hooks/useTilt";
import { HeartsGrid } from "./HeartsGrid";
import { PlushButton } from "../ui/squish/PlushButton";
import { TabBarContext } from "@/app/context/TabBarContext";
import { useFocusEffect } from "expo-router";

// Soft lavender -> soft pink, matching the reveal screens in the design.
// Swap for your theme gradient tokens if you have them.
const REVEAL_BG = ["#EFE0F6", "#F7C9DC"] as const;
const TILT = 0.5; // tilt responsiveness — halved from before (less sensitive)
const MAX_DRAG = (10 * Math.PI) / 180; // ~10° in radians
const DRAG_SENS = 0.004; // lower = gentler drag
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

declare const createImageBitmap: (
  source: Blob,
) => Promise<{ width: number; height: number }>;

type Vec2Ref = RefObject<{ x: number; y: number }>;
type LoadedTexture = { texture: THREE.Texture; aspect: number };

interface HugRevealProps {
  loaded: LoadedTexture | null;
  hasImage: boolean;
  message?: string;
  onHugBack: () => void;
  onClose: () => void;
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function Card({
  texture,
  aspect,
  rotTarget,
  rotCurrent,
}: {
  texture: THREE.Texture;
  aspect: number;
  rotTarget: Vec2Ref;
  rotCurrent: Vec2Ref;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const enter = useRef(0);
  const height = 4;
  const width = height * aspect;

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    enter.current = Math.min(1, enter.current + delta * 2.2);
    m.scale.setScalar(easeOutBack(enter.current));

    const targetX = rotTarget.current.x; // drag only — no device tilt
    const targetY = rotTarget.current.y;

    const k = Math.min(1, delta * 12);
    rotCurrent.current.x += (targetX - rotCurrent.current.x) * k;
    rotCurrent.current.y += (targetY - rotCurrent.current.y) * k;
    m.rotation.x = rotCurrent.current.x;
    m.rotation.y = rotCurrent.current.y;
  });

  return (
    <mesh ref={ref} position={[0, 0.5, 0]}>
      <planeGeometry args={[width, height]} />
      <meshPhysicalMaterial
        map={texture}
        roughness={0.5}
        metalness={0}
        clearcoat={1}
        clearcoatRoughness={0.4} // lower = sharper, glossier highlight
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function HugReveal({
  loaded,
  hasImage,
  message,
  onHugBack,
  onClose,
}: HugRevealProps) {
  const rotTarget = useRef({ x: 0, y: 0 });
  const rotCurrent = useRef({ x: 0, y: 0 });
  const rotStart = useRef({ x: 0, y: 0 });
  const tilt = useTilt();

  const { setIsTabBarHidden } = use(TabBarContext);

  useFocusEffect(() => {
    setIsTabBarHidden(true);
    return () => setIsTabBarHidden(false);
  });

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      rotStart.current = { x: rotCurrent.current.x, y: rotCurrent.current.y };
    })
    .onUpdate((e) => {
      rotTarget.current.y = clamp(
        rotStart.current.y + e.translationX * DRAG_SENS,
        -MAX_DRAG,
        MAX_DRAG,
      );
      rotTarget.current.x = clamp(
        rotStart.current.x + e.translationY * DRAG_SENS,
        -MAX_DRAG,
        MAX_DRAG,
      );
    })
    .onEnd(() => {
      rotTarget.current.x = 0; // snap back to center
      rotTarget.current.y = 0;
    });

  useEffect(() => {
    if (loaded) console.log("loaded: ", loaded);
  }, [loaded]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={REVEAL_BG} style={StyleSheet.absoluteFill} />

      <GestureDetector gesture={pan}>
        {/* FiberCanvas must be transparent for the gradient to show through —
            see the FiberCanvas edit in the message. */}
        <FiberCanvas style={styles.fill}>
          <HeartsGrid tilt={tilt} />
          <ambientLight intensity={0.8} />
          {hasImage && <ShineLight tilt={tilt} />}
          <directionalLight position={[2, 3, 4]} intensity={2} />
          {hasImage && loaded && (
            <Card
              texture={loaded.texture}
              aspect={loaded.aspect}
              rotTarget={rotTarget}
              rotCurrent={rotCurrent}
            />
          )}
        </FiberCanvas>
      </GestureDetector>

      {/* text-only hug → message box */}
      {!hasImage && (
        <View style={styles.messageWrap} pointerEvents="none">
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>
              {message ?? "Sending you a hug 💜"}
            </Text>
          </View>
        </View>
      )}

      {/* Bottom actions — swap these Pressables for your PlushButton. */}
      <View style={styles.buttonRow} pointerEvents="box-none">
        <PlushButton variant="primary" label="close" onPress={onClose} />
        <PlushButton variant="blush" label="hug back" onPress={onHugBack} />
      </View>
    </View>
  );
}

function ShineLight({ tilt }: { tilt: TiltRef }) {
  const ref = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const l = ref.current;
    if (!l) return;
    const R = 6; // how far the highlight travels — tune to taste
    l.position.set(tilt.current.y * R, -tilt.current.x * R, 5);
  });

  return <directionalLight ref={ref} intensity={0.6} color="#fad9d9" />;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill },
  fill: { flex: 1 },
  messageWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 140, // sits above the buttons
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  messageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
    maxWidth: 340,
    transform: [{ rotate: "-1.5deg" }], // gentle scrapbook tilt
    shadowColor: "#5A3FA0",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  messageText: {
    fontFamily: "Caveat_400Regular",
    fontSize: 26,
    lineHeight: 32,
    color: "#4A3A6B",
    textAlign: "center",
  },
  buttonRow: {
    flex: 1,
    justifyContent: "space-around",
    flexDirection: "row",
    position: "absolute",
    width: "100%",
    paddingHorizontal: 20,
    bottom: 60,
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  closeTxt: {
    color: "#6D54B5",
    fontSize: 16,
    fontWeight: "600",
  },
  hugBtn: {
    backgroundColor: "#FF7DA8",
    shadowColor: "#FF7DA8",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  hugTxt: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
