/**
 * HugReveal.tsx — full-screen 3D hug card overlay.
 *
 * Animation is driven entirely on the JS thread (plain refs + useFrame),
 * NOT Reanimated shared values. R3F's useFrame runs on the JS thread, and
 * reading a shared value there does NOT reflect a UI-thread animation in
 * flight — so a shared-value scale/rotation reads stale (0) and the mesh
 * never appears. Plain refs updated by a runOnJS(true) gesture stay on the
 * same thread useFrame reads from.
 */

import { useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as THREE from "three";

import { TiltRef, useTilt } from "@/hooks/useTilt";
import { FiberCanvas } from "../three/FiberCanvas";
import { HeartsGrid } from "./HeartsGrid";

declare const createImageBitmap: (source: Blob) => Promise<{
  width: number;
  height: number;
}>;

type Vec2Ref = React.RefObject<{ x: number; y: number }>;
type LoadedTexture = { texture: THREE.Texture; aspect: number };

interface HugRevealProps {
  photoUri: string;
}

// Gentle overshoot for a plush entrance.
function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function Card({
  texture,
  aspect,
  rotTarget,
  rotCurrent,
  tilt,
}: {
  texture: THREE.Texture;
  aspect: number;
  rotTarget: Vec2Ref;
  rotCurrent: Vec2Ref;
  tilt: TiltRef;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const enter = useRef(0); // 0 -> 1 entrance progress

  const height = 4;
  const width = height * aspect;

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    enter.current = Math.min(1, enter.current + delta * 2.2);
    m.scale.setScalar(easeOutBack(enter.current));

    // gesture target + phone tilt → card rotates as if you move around it
    const targetX = rotTarget.current.x + tilt.current.x;
    const targetY = rotTarget.current.y - tilt.current.y;

    const k = Math.min(1, delta * 12);
    rotCurrent.current.x += (targetX - rotCurrent.current.x) * k;
    rotCurrent.current.y += (targetY - rotCurrent.current.y) * k;
    m.rotation.x = rotCurrent.current.x;
    m.rotation.y = rotCurrent.current.y;
  });

  return (
    <mesh ref={ref}>
      <planeGeometry args={[width, height]} />
      {/* Keep hotpink to confirm the card is now visible + rotates.
          Once you see it, swap this line for:
          <meshStandardMaterial map={texture} roughness={0.85} metalness={0} side={THREE.DoubleSide} /> */}
      {/* <meshStandardMaterial color="hotpink" side={THREE.DoubleSide} /> */}
      <meshStandardMaterial
        map={texture}
        roughness={0.85}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function HugReveal({ photoUri }: HugRevealProps) {
  const [loaded, setLoaded] = useState<LoadedTexture | null>(null);

  // Plain JS refs — gesture writes target, useFrame reads it.
  const rotTarget = useRef({ x: 0, y: 0 });
  const rotCurrent = useRef({ x: 0, y: 0 });
  const rotStart = useRef({ x: 0, y: 0 });

  const tilt = useTilt();

  // --- Texture loading -------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let tex: THREE.Texture | null = null;

    (async () => {
      try {
        console.log("[tex] photoUri =", photoUri);
        const response = await fetch(photoUri);
        console.log("[tex] fetch ok?", response.ok, "status", response.status);
        const blob = await response.blob();
        console.log("[tex] blob size", blob.size, "type", blob.type);
        const bitmap = await createImageBitmap(blob);
        console.log("[tex] bitmap", bitmap.width, "x", bitmap.height);
        if (cancelled) return;

        tex = new THREE.Texture(bitmap as unknown as TexImageSource);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setLoaded({ texture: tex, aspect: bitmap.width / bitmap.height });
        console.log("[tex] loaded set ✅");
      } catch (err) {
        console.warn("[tex] FAILED:", String(err));
      }
    })();

    return () => {
      cancelled = true;
      tex?.dispose();
    };
  }, [photoUri]);

  // --- Gesture (runs on JS thread so it can touch refs directly) -------
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      rotStart.current = { x: rotCurrent.current.x, y: rotCurrent.current.y };
    })
    .onUpdate((e) => {
      rotTarget.current.y = rotStart.current.y + e.translationX * 0.008;
      rotTarget.current.x = Math.max(
        -0.6,
        Math.min(0.6, rotStart.current.x + e.translationY * 0.008),
      );
    })
    .onEnd(() => {
      rotTarget.current.x = 0; // tilt eases back to level; spin keeps its angle
    });

  return (
    <View style={styles.overlay}>
      <GestureDetector gesture={pan}>
        <FiberCanvas style={styles.fill}>
          {/* <FrameProbe /> */}
          {/* <color attach="background" args={["red"]} /> */}
          <HeartsGrid tilt={tilt} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 3, 4]} intensity={0.6} />
          {loaded && (
            <Card
              texture={loaded.texture}
              aspect={loaded.aspect}
              rotTarget={rotTarget}
              rotCurrent={rotCurrent}
              tilt={tilt}
            />
          )}
        </FiberCanvas>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#F5F3FF", // swap for your colors.soft
  },
  fill: { flex: 1 },
});
