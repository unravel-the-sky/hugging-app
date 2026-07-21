/**
 * <HugArms /> — 3D arms that grow from behind the avatar and wrap into a hug.
 *
 * Built for react-native-webgpu + three/webgpu + R3F (your FiberCanvas).
 * Texture-agnostic: it takes a ready THREE.Texture as `map`. Load it in the
 * parent with your existing useHugTexture hook (createImageBitmap, DOM-free) —
 * no TextureLoader, no Suspense.
 *
 *   const { loaded } = useHugTexture(avatarThumbUrl);   // reuse your hook
 *   ...
 *   <FiberCanvas style={styles.fill} camera={hugCamera}>
 *     <ambientLight intensity={0.75} color="#fff3ea" />
 *     <directionalLight position={[-1.4, 2, 2.2]} intensity={0.9} />
 *     <pointLight position={[1.5, -0.5, 2.5]} intensity={0.5} color="#ffe8d6" />
 *     <HugArms map={loaded?.texture ?? null} autoPlay />
 *   </FiberCanvas>
 */

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// ------------------------------------------------------------------ types
export type HugArmsProps = {
  /** Ready avatar texture (e.g. useHugTexture(avatarThumbUrl).loaded?.texture). */
  map?: THREE.Texture | null;
  /** Flip false → true to run the hug once. */
  play?: boolean;
  /** Run once automatically on mount — use THIS on the sealed screen. */
  autoPlay?: boolean;
  duration?: number;
  onComplete?: () => void;
  sleeveColor?: string;
  skinColor?: string;
  radius?: number;
  thickness?: number;
  spread?: number;
  depth?: number;
  cross?: number;
  handSize?: number;
  ring?: boolean;
};

type Pose = {
  thickness: number;
  spread: number;
  depth: number;
  cross: number;
  handSize: number;
  sleeve: THREE.Color;
  skin: THREE.Color;
};
type BuiltArm = {
  group: THREE.Group;
  tubeGeo: THREE.TubeGeometry;
  hand: THREE.Group;
};

// ------------------------------------------------------------------ easing
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = (t: number) => {
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------- arm rig (pure three)
function armPoints(side: number, p: Pose): THREE.Vector3[] {
  const s = side,
    spread = p.spread;
  const fz = p.depth * (s > 0 ? 1.0 : 0.9);
  const yb = (s > 0 ? -1 : 1) * p.cross;
  return [
    V(s * 1.02, s * 0.1, -0.55),
    V(s * 1.12 * spread, s * 0.02, 0.06),
    V(s * 0.72 * spread, yb * 0.5 - 0.02, fz * 0.85),
    V(s * 0.12, yb * 0.9, fz),
    V(-s * 0.42, yb * 0.7, fz * 0.86),
  ];
}

function buildHand(
  skinColor: THREE.Color,
  sleeveColor: THREE.Color,
  size: number,
): THREE.Group {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.7,
    metalness: 0,
  });
  const cloth = new THREE.MeshStandardMaterial({
    color: sleeveColor,
    roughness: 0.9,
    metalness: 0,
  });

  const palm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.135, 0.32, 24),
    skin,
  );
  palm.rotation.z = -Math.PI / 2;
  palm.scale.set(1, 1, 0.42);
  g.add(palm);

  const knuckle = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin);
  knuckle.scale.set(0.06, 0.185, 0.075);
  knuckle.position.x = 0.16;
  g.add(knuckle);

  const finger = (len: number, rad: number) => {
    const f = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(rad * 0.78, rad, len, 12),
      skin,
    );
    shaft.rotation.z = -Math.PI / 2;
    shaft.position.x = len / 2;
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(rad * 0.78, 12, 10),
      skin,
    );
    tip.position.x = len;
    const base = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), skin);
    f.add(shaft, tip, base);
    f.scale.z = 0.85;
    return f;
  };

  const specs = [
    { len: 0.155, rad: 0.043, y: 0.115, rot: 0.16 },
    { len: 0.185, rad: 0.047, y: 0.04, rot: 0.05 },
    { len: 0.165, rad: 0.044, y: -0.038, rot: -0.06 },
    { len: 0.125, rad: 0.037, y: -0.108, rot: -0.18 },
  ];
  for (const s of specs) {
    const f = finger(s.len, s.rad);
    f.position.set(0.17, s.y, 0.01);
    f.rotation.z = s.rot;
    g.add(f);
  }

  const thumb = finger(0.125, 0.052);
  thumb.position.set(-0.02, -0.15, 0.03);
  thumb.rotation.z = -1.15;
  g.add(thumb);

  const cuff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.135, 0.1, 20),
    cloth,
  );
  cuff.rotation.z = Math.PI / 2;
  cuff.position.set(-0.17, 0, 0);
  g.add(cuff);

  g.scale.setScalar(size);
  return g;
}

function buildArm(side: number, p: Pose): BuiltArm {
  const curve = new THREE.CatmullRomCurve3(
    armPoints(side, p),
    false,
    "catmullrom",
    0.5,
  );
  const tubeGeo = new THREE.TubeGeometry(curve, 96, p.thickness, 16, false);
  const tube = new THREE.Mesh(
    tubeGeo,
    new THREE.MeshStandardMaterial({
      color: p.sleeve,
      roughness: 0.9,
      metalness: 0,
    }),
  );
  const hand = buildHand(p.skin, p.sleeve, p.handSize);
  const end = curve.getPointAt(1),
    tan = curve.getTangentAt(1);
  hand.position.copy(end);
  hand.rotation.z = Math.atan2(tan.y, tan.x);
  hand.rotation.x = -0.25;
  const group = new THREE.Group();
  group.add(tube, hand);
  return { group, tubeGeo, hand };
}

// ------------------------------------------------------------------ component
export default function HugArms({
  map,
  play = false,
  autoPlay = false,
  duration = 1.1,
  onComplete,
  sleeveColor = "#efe4d6",
  skinColor = "#d99a6c",
  radius = 1,
  thickness = 0.11,
  spread = 1.02,
  depth = 0.6,
  cross = 0.16,
  handSize = 1,
  ring = true,
}: HugArmsProps) {
  const pose = useMemo<Pose>(
    () => ({
      thickness,
      spread,
      depth,
      cross,
      handSize,
      sleeve: new THREE.Color(sleeveColor),
      skin: new THREE.Color(skinColor),
    }),
    [thickness, spread, depth, cross, handSize, sleeveColor, skinColor],
  );

  const arms = useMemo<BuiltArm[]>(
    () => [buildArm(1, pose), buildArm(-1, pose)],
    [pose],
  );
  // dispose only what WE own (the tube geos). The map texture belongs to the parent hook.
  useEffect(() => () => arms.forEach((a) => a.tubeGeo.dispose()), [arms]);

  const discRef = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  const playing = useRef(false);
  const settle = useRef(-1);
  const done = useRef(false);

  const start = () => {
    progress.current = 0;
    playing.current = true;
    settle.current = -1;
    done.current = false;
  };

  const prevPlay = useRef(play);
  useEffect(() => {
    if (play && !prevPlay.current) start();
    prevPlay.current = play;
  }, [play]);
  useEffect(() => {
    if (autoPlay) start(); /* eslint-disable-next-line */
  }, []);

  const apply = (t: number) => {
    const grown = easeInOutCubic(clamp(t, 0, 1));
    for (const a of arms) {
      const idx = a.tubeGeo.index!.count;
      a.tubeGeo.setDrawRange(0, Math.floor((idx * grown) / 3) * 3);
      const hp = easeOutBack(smoothstep(0.72, 1.0, t));
      a.hand.scale.setScalar(clamp(hp, 0, 1) * handSize);
      a.hand.visible = t > 0.7;
    }
  };
  useEffect(() => {
    apply(0);
  }, [arms]); // start hidden so arms visibly grow in // eslint-disable-line

  useFrame((_, dt) => {
    if (playing.current) {
      progress.current += dt / duration;
      if (progress.current >= 1) {
        progress.current = 1;
        playing.current = false;
        settle.current = 0;
      }
      apply(progress.current);
    }
    if (settle.current >= 0 && discRef.current) {
      settle.current += dt;
      const s = Math.exp(-6 * settle.current) * Math.sin(settle.current * 22);
      discRef.current.scale.set(1 - s * 0.06, 1 + s * 0.08, 1);
      if (settle.current > 0.9) {
        settle.current = -1;
        discRef.current.scale.set(1, 1, 1);
        if (!done.current) {
          done.current = true;
          onComplete?.();
        }
      }
    }
  });

  return (
    <group>
      {/* avatar disc — unlit so the photo looks like a photo, still writes depth
          so the behind-portion of the arms is occluded ("grows from behind") */}
      <mesh ref={discRef}>
        <circleGeometry args={[radius, 64]} />
        <meshBasicMaterial
          map={map ?? undefined}
          color={map ? "#ffffff" : "#c9b8e8"}
          toneMapped={false}
        />
      </mesh>
      {ring && (
        <mesh>
          <torusGeometry args={[radius, 0.012, 8, 80]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      {arms.map((a, i) => (
        <primitive key={i} object={a.group} />
      ))}
    </group>
  );
}
