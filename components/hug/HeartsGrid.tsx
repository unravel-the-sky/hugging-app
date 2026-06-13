import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TiltRef } from "@/hooks/useTilt";

const COLS = 20;
const ROWS = 30;
const SPACING = 0.7; // world units between hearts
const PARALLAX = 1.2; // how far the grid shifts with tilt (bigger = more)

// Upright heart, centered on its own origin.
function makeHeartGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.5);
  s.bezierCurveTo(0, 0.8, -0.4, 1.1, -0.8, 1.1);
  s.bezierCurveTo(-1.4, 1.1, -1.4, 0.4, -1.4, 0.4);
  s.bezierCurveTo(-1.4, 0, -0.8, -0.5, 0, -1.0);
  s.bezierCurveTo(0.8, -0.5, 1.4, 0, 1.4, 0.4);
  s.bezierCurveTo(1.4, 0.4, 1.4, 1.1, 0.8, 1.1);
  s.bezierCurveTo(0.4, 1.1, 0, 0.8, 0, 0.5);
  const g = new THREE.ShapeGeometry(s);
  g.center();
  return g;
}

export function HeartsGrid({ tilt }: { tilt: TiltRef }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = COLS * ROWS;
  const geometry = useMemo(() => makeHeartGeometry(), []);

  // Fill per-instance transforms + colors once.
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let i = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x =
          (col - (COLS - 1) / 2) * SPACING + (Math.random() - 0.5) * 0.2;
        const y =
          (row - (ROWS - 1) / 2) * SPACING + (Math.random() - 0.5) * 0.2;
        dummy.position.set(x, y, 0);
        // Varied sizes — small hearts, occasional bigger one.
        const scale = 0.08 + Math.random() * 0.14;
        dummy.scale.setScalar(scale);
        dummy.rotation.z = (Math.random() - 0.5) * 0.4; // slight wobble
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        // Soft pinks/lavenders to match the app.
        color.setHSL(
          0.92 + Math.random() * 0.06,
          0.55,
          0.7 + Math.random() * 0.15,
        );
        mesh.setColorAt(i, color);
        i++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count]);

  // Parallax: the whole grid slides opposite the tilt, behind the card.
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    // tilt.x = pitch -> vertical shift, tilt.y = roll -> horizontal shift.
    mesh.position.x = tilt.current.y * PARALLAX;
    mesh.position.y = -tilt.current.x * PARALLAX;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, count]}
      position={[0, 0, -4]} /* behind the card (card sits at z=0) */
    >
      <meshBasicMaterial transparent opacity={0.9} toneMapped={false} />
    </instancedMesh>
  );
}
