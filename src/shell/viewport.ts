import { SCREEN_H, SCREEN_W } from '../game/grid';

export interface Viewport {
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_SCALE = 0.1;

/**
 * Where to draw the 320×200 screen inside a window, centred and letterboxed.
 * Integer scale when at least 2× fits (crisp, even pixels); below that, the
 * largest fractional fit so small phones aren't left with a tiny 1× picture.
 */
export function fitViewport(winW: number, winH: number): Viewport {
  const fit = Math.max(Math.min(winW / SCREEN_W, winH / SCREEN_H), MIN_SCALE);
  const scale = fit >= 2 ? Math.floor(fit) : fit;
  const width = SCREEN_W * scale;
  const height = SCREEN_H * scale;
  return { scale, x: (winW - width) / 2, y: (winH - height) / 2, width, height };
}
