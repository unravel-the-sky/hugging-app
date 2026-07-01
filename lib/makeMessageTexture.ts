import {
  Skia,
  TextAlign,
  ColorType,
  AlphaType,
  type SkTypefaceFontProvider,
} from "@shopify/react-native-skia";
import * as THREE from "three";

type Opts = {
  bg?: string;
  ink?: string;
  fontSize?: number;
  fontFamilies?: string[];
  fontMgr?: SkTypefaceFontProvider; // pass a provider to use Caveat etc.
  pad?: number;
  baseHeight?: number;
};

/** Renders `message` to a DataTexture sized to match the card's aspect. */
export const makeMessageTexture = (
  message: string,
  aspect: number,
  opts: Opts = {},
): THREE.DataTexture | null => {
  const texH = opts.baseHeight ?? 1024;
  const texW = Math.max(8, Math.round(texH * aspect));
  const pad = opts.pad ?? Math.round(texW * 0.1);

  const surface = Skia.Surface.MakeOffscreen(texW, texH);
  if (!surface) return null;
  const canvas = surface.getCanvas();

  // opaque paper background → no alpha-blend / sorting surprises
  const bg = Skia.Paint();
  bg.setColor(Skia.Color(opts.bg ?? "#FFFDF8"));
  canvas.drawRect(Skia.XYWHRect(0, 0, texW, texH), bg);

  const para = Skia.ParagraphBuilder.Make(
    { textAlign: TextAlign.Center },
    opts.fontMgr, // undefined → system font; pass a provider for Caveat
  )
    .pushStyle({
      color: Skia.Color(opts.ink ?? "#4A3A6B"),
      fontSize: opts.fontSize ?? Math.round(texW * 0.075),
      fontFamilies: opts.fontFamilies ?? ["serif"],
    })
    .addText(message)
    .build();

  para.layout(texW - pad * 2);
  const y = Math.max(pad, (texH - para.getHeight()) / 2);
  para.paint(canvas, pad, y);

  surface.flush();
  const image = surface.makeImageSnapshot();
  const src = image.readPixels(0, 0, {
    width: texW,
    height: texH,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  }) as Uint8Array | null;
  if (!src) return null;

  // Skia is top-left origin; three samples bottom-up → flip rows once.
  const rowBytes = texW * 4;
  const flipped = new Uint8Array(src.length);
  for (let row = 0; row < texH; row++) {
    const from = row * rowBytes;
    flipped.set(
      src.subarray(from, from + rowBytes),
      (texH - 1 - row) * rowBytes,
    );
  }

  const tex = new THREE.DataTexture(flipped, texW, texH, THREE.RGBAFormat);
  tex.type = THREE.UnsignedByteType;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false; // NPOT-safe
  tex.needsUpdate = true;
  return tex;
};
