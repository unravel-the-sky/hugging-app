import { useFrame } from "@react-three/fiber";
import { LinearGradient } from "expo-linear-gradient";
import { use, useEffect, useMemo, useRef, type RefObject } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as THREE from "three";

import { TabBarContext } from "@/app/context/TabBarContext";
import { TiltRef, useTilt } from "@/hooks/useTilt";
import { useFocusEffect } from "expo-router";
import { FiberCanvas } from "../three/FiberCanvas";
import { PlushButton } from "../ui/squish/PlushButton";
import { HeartsGrid } from "./HeartsGrid";
import { makeMessageTexture } from "@/lib/makeMessageTexture";
import { useFonts } from "expo-font";

const REVEAL_BG = ["#EFE0F6", "#F7C9DC"] as const;
const MAX_DRAG = (10 * Math.PI) / 180; // ~10° free tilt
const DRAG_SENS = 0.004; // gentle tilt (non-flip case)
const FLIP_SENS = 0.0075; // horizontal flip sensitivity — tune to taste
const FACE_INSET = 1; // photo/message inset → cream postcard border
const DEPTH = 0.03; // card thickness (world units)

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

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

function Postcard({
  texture,
  aspect,
  messageTexture,
  rotTarget,
  rotCurrent,
}: {
  texture: THREE.Texture;
  aspect: number;
  messageTexture: THREE.Texture | null;
  rotTarget: Vec2Ref;
  rotCurrent: Vec2Ref;
}) {
  const ref = useRef<THREE.Group>(null);
  const enter = useRef(0);
  const height = 4;
  const width = height * aspect;
  const faceW = width * FACE_INSET;
  const faceH = height * FACE_INSET;

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    enter.current = Math.min(1, enter.current + delta * 2.2);
    g.scale.setScalar(easeOutBack(enter.current));

    const k = Math.min(1, delta * 12);
    rotCurrent.current.x += (rotTarget.current.x - rotCurrent.current.x) * k;
    rotCurrent.current.y += (rotTarget.current.y - rotCurrent.current.y) * k;
    g.rotation.x = rotCurrent.current.x;
    g.rotation.y = rotCurrent.current.y;
  });

  return (
    <group ref={ref} position={[0, 1, 0]}>
      {/* paper body — gives thickness + cream edges */}
      <mesh>
        <boxGeometry args={[width, height, DEPTH]} />
        <meshPhysicalMaterial
          color="#FFFFFF"
          roughness={0.7}
          metalness={0.05}
          clearcoat={0.35}
          clearcoatRoughness={0.25}
        />
      </mesh>

      {/* front: photo (single-sided → hidden from behind) */}
      <mesh position={[0, 0, DEPTH / 2 + 0.002]}>
        <planeGeometry args={[faceW, faceH]} />
        <meshPhysicalMaterial
          color="#000000"
          emissive="#ffffff"
          emissiveMap={texture}
          emissiveIntensity={1}
          toneMapped={false}
          roughness={0.6}
          metalness={0.2}
          clearcoat={0.5}
          clearcoatRoughness={0.18}
        />
      </mesh>

      {/* back: message — rotated 180° so it reads correctly from behind */}
      {messageTexture && (
        <mesh
          position={[0, 0, -(DEPTH / 2 + 0.002)]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[faceW, faceH]} />
          <meshPhysicalMaterial
            map={messageTexture}
            roughness={0.75}
            metalness={0.05}
            clearcoat={0.3}
            clearcoatRoughness={0.3}
          />
        </mesh>
      )}
    </group>
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

  const customFontMgr = useFonts({
    CuteFont: require("@/assets/fonts/JustMeAgainDownHere-Regular.ttf"),
  });

  useFocusEffect(() => {
    setIsTabBarHidden(true);
    return () => setIsTabBarHidden(false);
  });

  const canFlip = hasImage && !!loaded && !!message && message.trim() !== "";

  const messageTexture = useMemo(() => {
    if (!canFlip || !loaded) return null;
    return makeMessageTexture(message!.trim(), loaded.aspect, {
      bg: "#FFFFFF",
      ink: "#4A3A6B",
    });
  }, [canFlip, message, loaded]);

  useEffect(() => () => messageTexture?.dispose(), [messageTexture]);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      rotStart.current = { x: rotCurrent.current.x, y: rotCurrent.current.y };
    })
    .onUpdate((e) => {
      // vertical tilt always gently clamped
      rotTarget.current.x = clamp(
        rotStart.current.x + e.translationY * DRAG_SENS,
        -MAX_DRAG,
        MAX_DRAG,
      );

      if (canFlip) {
        // drag left toward -π to flip; small tilt to the right
        rotTarget.current.y = clamp(
          rotStart.current.y + e.translationX * FLIP_SENS,
          -Math.PI,
          MAX_DRAG,
        );
      } else {
        rotTarget.current.y = clamp(
          rotStart.current.y + e.translationX * DRAG_SENS,
          -MAX_DRAG,
          MAX_DRAG,
        );
      }
    })
    .onEnd(() => {
      rotTarget.current.x = 0;
      if (canFlip) {
        // settle on the nearer face: front (0) or back (-π)
        rotTarget.current.y = rotTarget.current.y < -Math.PI / 2 ? -Math.PI : 0;
      } else {
        rotTarget.current.y = 0;
      }
    });

  const showOverlay = !canFlip; // message lives on the back when flippable

  return (
    <View style={styles.root}>
      <LinearGradient colors={REVEAL_BG} style={StyleSheet.absoluteFill} />

      <GestureDetector gesture={pan}>
        <FiberCanvas style={styles.fill}>
          <HeartsGrid tilt={tilt} />
          <ambientLight intensity={1} />
          {hasImage && <ShineLight tilt={tilt} />}
          {hasImage && loaded && (
            <Postcard
              texture={loaded.texture}
              aspect={loaded.aspect}
              messageTexture={messageTexture}
              rotTarget={rotTarget}
              rotCurrent={rotCurrent}
            />
          )}
        </FiberCanvas>
      </GestureDetector>

      {showOverlay && (
        <View
          style={[styles.messageWrap, { bottom: hasImage ? 140 : "50%" }]}
          pointerEvents="none"
        >
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>
              {message !== "" ? `${message}` : "Sending you a hug 💜"}
            </Text>
          </View>
        </View>
      )}

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
    const R = 5;
    l.position.set(tilt.current.y * R, -tilt.current.x * R + 1, 15);
  });
  return <directionalLight ref={ref} intensity={0.1} color="#fff" />;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill },
  fill: {
    flex: 1,
    shadowColor: "#5A3FA0",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  messageWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  messageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: 340,
    transform: [{ rotate: "-1.5deg" }],
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
});
