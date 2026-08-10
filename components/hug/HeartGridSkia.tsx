import {
  Atlas,
  Canvas,
  Group,
  Skia,
  rect,
  useClock,
  useRSXformBuffer,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import { PixelRatio, StyleSheet, useWindowDimensions } from "react-native";
import type { SharedValue } from "react-native-reanimated";

const SCALE = PixelRatio.get();

const COLS = 20;
const ROWS = 30;
const COUNT = COLS * ROWS;
const SPACING = 0.6; // world units, same as the three.js version
const PARALLAX = 1.2;
const PULSE_AMP = 0.21;
const PULSE_SPEED = 2.0; // rad/s

// the heart shape, converted from the Three.Shape beziers into SVG space
// (y flipped, fitted to a 64 × 48 box)
const HEART =
  "M32 13.7 C32 6.9 22.9 0 13.7 0 C0 0 0 16 0 16 C0 25.1 13.7 36.6 32 48 " +
  "C50.3 36.6 64 25.1 64 16 C64 16 64 0 50.3 0 C41.1 0 32 6.9 32 13.7 Z";
// const HEART =
//   "M14 42 C14 42 2 34 2 26.5 C2 22.5 5 20 8 20 C11 20 14 23 14 25 " +
//   "C14 23 17 20 20 20 C23 20 26 22.5 26 26.5 C26 34 14 42 14 42 Z " +
//   "M38 26 C38 26 26 18 26 10.5 C26 6.5 29 4 32 4 C35 4 38 7 38 9 " +
//   "C38 7 41 4 44 4 C47 4 50 6.5 50 10.5 C50 18 38 26 38 26 Z";

// try different svgs here but this seems cute
// const HEART =
//   "M32 0 C34 14 38 20 52 22 C38 24 34 30 32 44 C30 30 26 24 12 22 C26 20 30 14 32 0 Z";
const SPRITE_W = 64;
const SPRITE_H = 48;
const SW = SPRITE_W * SCALE;
const SH = SPRITE_H * SCALE;

type Heart = {
  x: number;
  y: number;
  scale: number;
  rot: number;
  phase: number;
};

export function HeartsGridSkia({
  tiltX,
  tiltY,
  unit = 4,
}: {
  tiltX: SharedValue<number>; // same values driving the card's rotateX
  tiltY: SharedValue<number>;
  unit?: number; // px per world unit — cardH / 4 keeps the original scale
}) {
  const clock = useClock();

  // one rasterised sprite, reused by every instance
  const image = useMemo(() => {
    const surface =
      Skia.Surface.MakeOffscreen(SPRITE_W * SCALE, SPRITE_H * SCALE) ??
      Skia.Surface.Make(SPRITE_W * SCALE, SPRITE_H * SCALE);
    if (!surface) return null;

    const canvas = surface.getCanvas();
    const path = Skia.Path.MakeFromSVGString(HEART);
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(Skia.Color("rgba(255,184,224,0.9)"));

    canvas.scale(SCALE, SCALE);
    if (path) canvas.drawPath(path, paint);
    surface.flush();

    return surface.makeImageSnapshot().makeNonTextureImage();
  }, []);

  const sprites = useMemo(
    () => new Array(COUNT).fill(0).map(() => rect(0, 0, SW, SH)),
    [],
  );

  // identical layout maths to the three.js version, converted to px
  const data = useMemo<Heart[]>(() => {
    const arr: Heart[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        arr.push({
          x:
            ((col - (COLS - 1) / 2) * SPACING + (Math.random() - 0.5) * 0.2) *
            unit,
          y:
            ((row - (ROWS - 1) / 2) * SPACING + (Math.random() - 0.5) * 0.2) *
            unit,
          scale: (0.08 + Math.random() * 0.1) * unit,
          rot: (Math.random() - 0.5) * 0.5,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    return arr;
  }, [unit]);

  const transforms = useRSXformBuffer(COUNT, (val, i) => {
    "worklet";
    const d = data[i];
    const t = clock.value / 1000;
    const pulse = 1 + PULSE_AMP * Math.sin(t * PULSE_SPEED + d.phase);

    // world units → sprite units (the heart is 1.4 units wide in three)
    const s = (d.scale * pulse * 2.8) / SW;
    const scos = s * Math.cos(d.rot);
    const ssin = s * Math.sin(d.rot);

    const px = d.x + tiltY.value * PARALLAX * unit;
    const py = -d.y - tiltX.value * PARALLAX * unit;

    // RSXform anchors at the sprite's top-left, so subtract the rotated
    // half-extent to spin each heart about its own centre
    const cx = SW / 2;
    const cy = SH / 2;
    val.set(
      scos,
      ssin,
      px - (scos * cx - ssin * cy),
      py - (ssin * cx + scos * cy),
    );
  });

  const { width: w, height: h } = useWindowDimensions();

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group transform={[{ translateX: w * 0.5 }, { translateY: h * 0.5 }]}>
        <Atlas image={image} sprites={sprites} transforms={transforms} />
      </Group>
    </Canvas>
  );
}
