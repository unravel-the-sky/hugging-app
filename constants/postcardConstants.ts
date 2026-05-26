// Identity matrix — for what the image looks like as is
export const IDENTITY: number[] = [
  1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0,
];

// "Pure white" matrix — every pixel forced to white
export const WHITE: number[] = [
  0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0,
];

// Color matrix presets
export const FILTERS = {
  normal: {
    name: "Normal",
    matrix: IDENTITY,
  },
  vivid: {
    name: "Vivid",
    matrix: [
      1.438, -0.122, -0.016, 0, -0.05, -0.062, 1.378, -0.016, 0, -0.05, -0.062,
      -0.122, 1.483, 0, -0.05, 0, 0, 0, 1, 0,
    ],
  },
  sepia: {
    name: "Sepia",
    matrix: [
      0.393, 0.769, 0.189, 0, 0, 0.349, 0.686, 0.168, 0, 0, 0.272, 0.534, 0.131,
      0, 0, 0, 0, 0, 1, 0,
    ],
  },
  bw: {
    name: "B&W",
    matrix: [
      0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114,
      0, 0, 0, 0, 0, 1, 0,
    ],
  },
} as const;

export type FilterKey = keyof typeof FILTERS;

export const filterKeys = Object.keys(FILTERS) as FilterKey[];

// Linearly interpolate between two matrices, whoa took from claude
export const lerpMatrix = (
  a: readonly number[],
  b: readonly number[],
  t: number,
) => {
  "worklet";
  return a.map((v, i) => v + (b[i] - v) * t);
};
