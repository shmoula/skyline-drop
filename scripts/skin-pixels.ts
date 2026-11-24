export interface RgbaImage {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row-major. */
  data: Uint8Array;
}

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/**
 * Art QA for one image: every pixel must be fully transparent or fully opaque
 * (no anti-aliasing), and every opaque pixel must use a palette colour.
 * One message per distinct problem, each naming the file.
 */
export function checkSkinPixels(png: RgbaImage, file: string, palette: string[]): string[] {
  const allowed = new Set(palette.map((c) => c.toUpperCase()));
  const softAlpha = new Set<number>();
  const offPalette = new Set<string>();
  for (let i = 0; i < png.width * png.height * 4; i += 4) {
    const a = png.data[i + 3]!;
    if (a === 0) continue;
    if (a !== 255) {
      softAlpha.add(a);
      continue;
    }
    const c = hex(png.data[i]!, png.data[i + 1]!, png.data[i + 2]!);
    if (!allowed.has(c)) offPalette.add(c);
  }
  const errors: string[] = [];
  if (softAlpha.size > 0) errors.push(`${file}: half-transparent pixels (alpha ${[...softAlpha].join(', ')}); use alpha 0 or 255 only`);
  for (const c of offPalette) errors.push(`${file}: colour ${c} is not in the palette`);
  return errors;
}
