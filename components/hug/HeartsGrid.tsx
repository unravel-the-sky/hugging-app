import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TiltRef } from "@/hooks/useTilt";

const COLS = 20;
const ROWS = 30;
const SPACING = 0.7;
const PARALLAX = 1.2;
const PULSE_AMP = 0.22; // ±22% size
const PULSE_SPEED = 1.3;

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
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Per-instance base data: position, base scale, rotation, and a random
  // pulse phase so each heart breathes independently.
  const data = useMemo(() => {
    const arr: {
      x: number;
      y: number;
      scale: number;
      rot: number;
      phase: number;
    }[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        arr.push({
          x: (col - (COLS - 1) / 2) * SPACING + (Math.random() - 0.5) * 0.2,
          y: (row - (ROWS - 1) / 2) * SPACING + (Math.random() - 0.5) * 0.2,
          scale: 0.08 + Math.random() * 0.14,
          rot: (Math.random() - 0.5) * 0.4,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    return arr;
  }, []);

  // Colors only need to be set once.
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    data.forEach((_, i) => {
      color.setHSL(
        0.92 + Math.random() * 0.06,
        0.55,
        0.72 + Math.random() * 0.15,
      );
      mesh.setColorAt(i, color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [data]);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;

    // Breathing: rewrite each instance's scale with a per-heart sine pulse.
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const pulse = 1 + PULSE_AMP * Math.sin(t * PULSE_SPEED + d.phase);
      dummy.position.set(d.x, d.y, 0);
      dummy.rotation.set(0, 0, d.rot);
      dummy.scale.setScalar(d.scale * pulse);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Parallax: the whole grid drifts with tilt, behind the card.
    mesh.position.x = tilt.current.y * PARALLAX;
    mesh.position.y = -tilt.current.x * PARALLAX;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, count]}
      position={[0, 0, -4]}
    >
      <meshBasicMaterial transparent opacity={0.9} toneMapped={false} />
    </instancedMesh>
  );
}
