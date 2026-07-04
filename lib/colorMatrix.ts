// lib/colorMatrix.ts
//
// 4x5 colour-matrix maths for Skia's <ColorMatrix>. Everything is a worklet so
// it can run inside PostImage's useDerivedValue on the UI thread.
//
// A matrix is a flat 20-number array (4 rows x 5 cols) acting on [r,g,b,a,1],
// with colour components in the 0..1 range — same convention as your WHITE /
// lerpMatrix in postcardConstants.

/**
 * Compose two colour matrices: returns `b ∘ a`, i.e. apply `a` first, then `b`.
 * (5th row is implicitly [0,0,0,0,1].)
 */
export function multiplyColorMatrix(b: number[], a: number[]): number[] {
  "worklet";
  const out = new Array(20).fill(0);
  const get = (m: number[], r: number, c: number) =>
    r < 4 ? m[r * 5 + c] : c === 4 ? 1 : 0;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      let sum = 0;
      for (let k = 0; k < 5; k++) sum += get(b, r, k) * get(a, k, c);
      out[r * 5 + c] = sum;
    }
  }
  return out;
}

/**
 * Hue rotation (SVG feColorMatrix type="hueRotate"). `deg` in degrees.
 */
export function hueRotateMatrix(deg: number): number[] {
  "worklet";
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    0.213 + c * 0.787 - s * 0.213,
    0.715 - c * 0.715 - s * 0.715,
    0.072 - c * 0.072 + s * 0.928,
    0,
    0,

    0.213 - c * 0.213 + s * 0.143,
    0.715 + c * 0.285 + s * 0.14,
    0.072 - c * 0.072 - s * 0.283,
    0,
    0,

    0.213 - c * 0.213 - s * 0.787,
    0.715 - c * 0.715 + s * 0.715,
    0.072 + c * 0.928 + s * 0.072,
    0,
    0,

    0,
    0,
    0,
    1,
    0,
  ];
}

/**
 * Luminance / brightness as an additive offset. `amount` in ~[-0.4, 0.4]
 * (matches the "+9%" readout: 0.09 == +9%). Positive brightens.
 */
export function luminanceMatrix(amount: number): number[] {
  "worklet";
  return [
    1,
    0,
    0,
    0,
    amount,
    0,
    1,
    0,
    0,
    amount,
    0,
    0,
    1,
    0,
    amount,
    0,
    0,
    0,
    1,
    0,
  ];
}

/**
 * Convenience: compose a preset filter with live hue + luminance tuning.
 * final = luminance ∘ hue ∘ preset  (preset applied first).
 */
export function tunedMatrix(
  preset: number[],
  hue: number,
  light: number,
): number[] {
  "worklet";
  let m = multiplyColorMatrix(hueRotateMatrix(hue), preset);
  m = multiplyColorMatrix(luminanceMatrix(light), m);
  return m;
}
