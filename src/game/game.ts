import { CELL_H, CELL_W, COLS, GROUND_ROW, PLANE_START_ROW, SCREEN_W } from './grid';
import { DEFAULT_TUNING, planeSpeed, type Tuning } from './tuning';

export type Phase = 'title' | 'playing' | 'clearing' | 'landed' | 'crashed' | 'gameOver';

export interface City {
  /** Floors per column (length COLS); 0 = empty. */
  heights: number[];
  /** Building type per column, 1..buildingTypes (0 for empty columns). */
  types: number[];
}

export interface Explosion {
  x: number;
  y: number;
  ageMs: number;
}

export interface GameState {
  phase: Phase;
  timerMs: number;
  level: number;
  score: number;
  best: number;
  newBest: boolean;
  plane: { x: number; row: number };
  planeWidth: number;
  buildingTypes: number;
  bomb: { col: number; y: number } | null;
  city: City;
  explosions: Explosion[];
  rngState: number;
  tuning: Tuning;
}

export interface NewGameOptions {
  best: number;
  seed: number;
  planeWidth: number;
  buildingTypes: number;
  tuning?: Partial<Tuning>;
}

export interface Input {
  pressed: boolean;
}

/** A fresh game sitting on the title screen. */
export function newGame(opts: NewGameOptions): GameState {
  return {
    phase: 'title',
    timerMs: 0,
    level: 1,
    score: 0,
    best: opts.best,
    newBest: false,
    plane: { x: -opts.planeWidth, row: PLANE_START_ROW },
    planeWidth: opts.planeWidth,
    buildingTypes: opts.buildingTypes,
    bomb: null,
    city: emptyCity(),
    explosions: [],
    rngState: opts.seed,
    tuning: { ...DEFAULT_TUNING, ...opts.tuning },
  };
}

/** Advance the game by `dtMs`. Pure: never mutates `s`. */
export function step(s: GameState, input: Input, dtMs: number): GameState {
  if (s.phase === 'title') return input.pressed ? startRun(s) : s;
  let next: GameState = { ...s, explosions: ageExplosions(s.explosions, dtMs) };
  if (input.pressed) next = dropBomb(next);
  next = fallBomb(next, dtMs);
  return { ...next, plane: flyPlane(next, dtMs) };
}

/** How long an explosion stays in the state (the renderer animates within this). */
export const EXPLOSION_MS = 400;

function ageExplosions(list: Explosion[], dtMs: number): Explosion[] {
  return list.map((e) => ({ ...e, ageMs: e.ageMs + dtMs })).filter((e) => e.ageMs < EXPLOSION_MS);
}

function dropBomb(s: GameState): GameState {
  if (s.bomb) return s;
  const col = Math.floor((s.plane.x + s.planeWidth / 2) / CELL_W);
  if (col < 0 || col >= COLS) return s;
  return { ...s, bomb: { col, y: (s.plane.row + 1) * CELL_H } };
}

function fallBomb(s: GameState, dtMs: number): GameState {
  if (!s.bomb) return s;
  const { col } = s.bomb;
  const y = s.bomb.y + (s.tuning.bombFallPxPerS * dtMs) / 1000;
  const h = s.city.heights[col] ?? 0;
  const topY = (GROUND_ROW - h) * CELL_H;
  if (h > 0 && y + CELL_H >= topY) {
    const removed = Math.min(s.tuning.floorsPerBomb, h);
    const heights = s.city.heights.slice();
    heights[col] = h - removed;
    const types = s.city.types.slice();
    if (heights[col] === 0) types[col] = 0;
    return {
      ...s,
      bomb: null,
      score: s.score + removed * s.level,
      city: { heights, types },
      explosions: [...s.explosions, { x: col * CELL_W, y: topY, ageMs: 0 }],
    };
  }
  if (y + CELL_H >= GROUND_ROW * CELL_H) return { ...s, bomb: null };
  return { ...s, bomb: { col, y } };
}

function flyPlane(s: GameState, dtMs: number): GameState['plane'] {
  const x = s.plane.x + (planeSpeed(s.level, s.tuning) * dtMs) / 1000;
  if (x >= SCREEN_W) return { x: x - (SCREEN_W + s.planeWidth), row: s.plane.row + 1 };
  return { x, row: s.plane.row };
}

function startRun(s: GameState): GameState {
  return {
    ...s,
    phase: 'playing',
    timerMs: 0,
    level: 1,
    score: 0,
    newBest: false,
    plane: { x: -s.planeWidth, row: PLANE_START_ROW },
    bomb: null,
    explosions: [],
    city: emptyCity(), // real generation arrives in Task 5
  };
}

function emptyCity(): City {
  return { heights: Array<number>(COLS).fill(0), types: Array<number>(COLS).fill(0) };
}
