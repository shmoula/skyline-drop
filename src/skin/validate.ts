import { CELL_H, CELL_W, SCREEN_H, SCREEN_W } from '../game/grid';
import type { ImageLike, SkinManifest } from './types';

const MAX_PLANE_FRAME_W = 32;
const FONT_COLS = 16;
const FONT_ROWS = 4; // ASCII 32–95

/** Files every skin must have for this manifest. */
export function requiredFiles(m: SkinManifest): string[] {
  const files = ['plane.png', 'bomb.png', 'ground.png', 'font.png'];
  for (let n = 1; n <= m.buildingTypes; n++) files.push(`building-${n}-floor.png`, `building-${n}-roof.png`);
  return files;
}

/** Problems with skin.json itself; [] when it has every field with a sane value. */
function manifestErrors(m: unknown): string[] {
  if (typeof m !== 'object' || m === null) return ['skin.json: must be a JSON object'];
  const o = m as Record<string, unknown>;
  const errors: string[] = [];
  const posInt = (v: unknown) => Number.isInteger(v) && (v as number) > 0;
  if (typeof o.name !== 'string') errors.push('skin.json: "name" must be a string');
  for (const key of ['buildingTypes', 'planeFrames', 'explosionFrames'] as const) {
    if (!posInt(o[key])) errors.push(`skin.json: "${key}" must be a positive whole number`);
  }
  const font = o.font as Record<string, unknown> | undefined;
  if (!font || !posInt(font.charWidth) || !posInt(font.charHeight)) {
    errors.push('skin.json: "font" needs positive whole "charWidth" and "charHeight"');
  }
  const colours = o.colours as Record<string, unknown> | undefined;
  if (!colours || typeof colours.background !== 'string') errors.push('skin.json: "colours.background" must be a colour string');
  if (o.palette !== undefined && !(Array.isArray(o.palette) && o.palette.every((c) => typeof c === 'string'))) {
    errors.push('skin.json: "palette" must be a list of colour strings');
  }
  return errors;
}

/** Size problem for one present image, or null. */
function sizeError(file: string, img: ImageLike, m: SkinManifest): string | null {
  const { width: w, height: h } = img;
  const exact = (ew: number, eh: number) => (w === ew && h === eh ? null : `${file}: must be ${ew}×${eh} px, is ${w}×${h}`);
  if (/^building-\d+-(floor|roof)\.png$/.test(file) || file === 'ground.png') return exact(CELL_W, CELL_H);
  switch (file) {
    case 'plane.png':
      if (h !== CELL_H) return `${file}: must be ${CELL_H} px tall, is ${h}`;
      if (w % m.planeFrames !== 0) return `${file}: width ${w} does not split into ${m.planeFrames} frames`;
      if (w / m.planeFrames > MAX_PLANE_FRAME_W) return `${file}: each frame must be at most ${MAX_PLANE_FRAME_W} px wide, is ${w / m.planeFrames}`;
      return null;
    case 'bomb.png':
      return w <= CELL_W && h <= CELL_H ? null : `${file}: must be at most ${CELL_W}×${CELL_H} px, is ${w}×${h}`;
    case 'explosion.png':
      if (h > 2 * CELL_H) return `${file}: must be at most ${2 * CELL_H} px tall, is ${h}`;
      return w % m.explosionFrames === 0 ? null : `${file}: width ${w} does not split into ${m.explosionFrames} frames`;
    case 'font.png':
      return exact(FONT_COLS * m.font.charWidth, FONT_ROWS * m.font.charHeight);
    case 'background.png':
      return exact(SCREEN_W, SCREEN_H);
    default:
      return null;
  }
}

/** Every problem with a skin, one message per problem, each naming the file. [] when valid. */
export function validateSkin(manifest: unknown, images: Record<string, ImageLike | undefined>): string[] {
  const errors = manifestErrors(manifest);
  if (errors.length > 0) return errors;
  const m = manifest as SkinManifest;
  for (const file of requiredFiles(m)) if (!images[file]) errors.push(`${file}: missing`);
  for (const [file, img] of Object.entries(images)) {
    if (!img) continue;
    const e = sizeError(file, img, m);
    if (e) errors.push(e);
  }
  return errors;
}
