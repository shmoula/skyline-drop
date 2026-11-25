import { CELL_H, CELL_W, COLS, GROUND_ROW, PLANE_START_ROW, SCREEN_W } from './grid';
import { generateCity, type City } from './city';
import { DEFAULT_TUNING, planeSpeed, type Tuning } from './tuning';
import type { RuleSet } from './rules';

export type { City } from './city';

export type Phase = 'title' | 'playing' | 'clearing' | 'landed' | 'crashed' | 'gameOver';

export interface Explosion {
  x: number;
  y: number;
  ageMs: number;
}

export interface Challenge {
  name: string;
  score: number;
}

export interface GameState {
  mode: 'run' | 'single';
  singleCity: City | null;
  /** Plane row at the moment a single-city level was cleared; null until then. */
  clearedRow: number | null;
  bonusPerRow: number;
  challenge: Challenge | null;
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
    mode: 'run',
    singleCity: null,
    clearedRow: null,
    bonusPerRow: 0,
    challenge: null,
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

export interface NewCityGameOptions {
  city: City;
  rules: RuleSet;
  best: number;
  challenge: Challenge | null;
}

/** A fresh single-city game (one shared city, one level) sitting on the title screen. */
export function newCityGame(opts: NewCityGameOptions): GameState {
  return {
    ...newGame({ best: opts.best, seed: 1, planeWidth: opts.rules.planeWidth, buildingTypes: 1 }),
    mode: 'single',
    singleCity: opts.city,
    city: opts.city,
    level: opts.rules.level,
    bonusPerRow: opts.rules.bonusPerRow,
    challenge: opts.challenge,
    tuning: { ...opts.rules.tuning },
  };
}

/** Can the bot (with the usual human slack) clear `city` under `rules`? */
export function isClearable(city: City, rules: RuleSet): boolean {
  const base = newCityGame({ city, rules, best: 0, challenge: null });
  return (
    botClears(base, rules.level, city, PLANE_START_ROW + BOT_SLACK_ROWS) &&
    botClears(base, rules.level, city, PLANE_START_ROW)
  );
}

/** Advance the game by `dtMs`. Pure: never mutates `s`. */
export function step(s: GameState, input: Input, dtMs: number): GameState {
  switch (s.phase) {
    case 'title':
      return input.pressed ? startRun(s) : s;
    case 'crashed':
      return tickCrashed(s, dtMs);
    case 'gameOver':
      return tickGameOver(s, input, dtMs);
    case 'landed':
      return tickLanded(s, dtMs);
    case 'clearing':
      return tickClearing(s, dtMs);
    default:
      return tickFlying(s, input, dtMs);
  }
}

function tickFlying(s: GameState, input: Input, dtMs: number): GameState {
  let next: GameState = { ...s, explosions: ageExplosions(s.explosions, dtMs) };
  if (input.pressed) next = dropBomb(next);
  next = fallBomb(next, dtMs);
  next = { ...next, plane: flyPlane(next, dtMs) };
  if (hitsBuilding(next)) return crash(next);
  if (!next.bomb && next.city.heights.every((h) => h === 0)) {
    const single = next.mode === 'single';
    const heightBonus = single ? (GROUND_ROW - 1 - next.plane.row) * next.bonusPerRow : 0;
    return {
      ...next,
      phase: 'clearing',
      timerMs: 0,
      clearedRow: single ? next.plane.row : next.clearedRow,
      score: next.score + next.tuning.clearBonusPerLevel * next.level + heightBonus,
    };
  }
  return next;
}

/** City is gone: keep flying, drop a row every `landingDropMs` until just above the ground. */
function tickClearing(s: GameState, dtMs: number): GameState {
  const lastRow = GROUND_ROW - 1;
  let timerMs = s.timerMs + dtMs;
  let { x, row } = flyPlane(s, dtMs);
  while (timerMs >= s.tuning.landingDropMs && row < lastRow) {
    timerMs -= s.tuning.landingDropMs;
    row += 1;
  }
  row = Math.min(row, lastRow);
  const explosions = ageExplosions(s.explosions, dtMs);
  if (row === lastRow) return { ...s, phase: 'landed', timerMs: 0, plane: { x, row }, explosions };
  return { ...s, timerMs, plane: { x, row }, explosions };
}

function tickLanded(s: GameState, dtMs: number): GameState {
  const timerMs = s.timerMs + dtMs;
  if (timerMs < s.tuning.landingPauseMs) return { ...s, timerMs, explosions: ageExplosions(s.explosions, dtMs) };
  if (s.mode === 'single') {
    return {
      ...s,
      phase: 'gameOver',
      timerMs: 0,
      explosions: ageExplosions(s.explosions, dtMs),
      newBest: s.score > s.best,
      best: Math.max(s.best, s.score),
    };
  }
  const level = s.level + 1;
  const { city, rngState } = newCity(s, level);
  return {
    ...s,
    phase: 'playing',
    timerMs: 0,
    level,
    city,
    rngState,
    plane: { x: -s.planeWidth, row: PLANE_START_ROW },
    bomb: null,
    explosions: [],
  };
}

function tickCrashed(s: GameState, dtMs: number): GameState {
  const timerMs = s.timerMs + dtMs;
  const explosions = ageExplosions(s.explosions, dtMs);
  if (timerMs < s.tuning.crashMs) return { ...s, timerMs, explosions };
  return {
    ...s,
    phase: 'gameOver',
    timerMs: 0,
    explosions,
    newBest: s.score > s.best,
    best: Math.max(s.best, s.score),
  };
}

function tickGameOver(s: GameState, input: Input, dtMs: number): GameState {
  const timerMs = s.timerMs + dtMs;
  if (input.pressed && s.timerMs >= s.tuning.gameOverLockMs) return startRun(s);
  return { ...s, timerMs };
}

/** Columns the plane sprite overlaps on screen (empty when fully off-screen). */
function planeColumns(s: GameState): number[] {
  const left = Math.max(s.plane.x, 0);
  const right = Math.min(s.plane.x + s.planeWidth - 1, SCREEN_W - 1);
  if (right < left) return [];
  const cols: number[] = [];
  for (let c = Math.floor(left / CELL_W); c <= Math.floor(right / CELL_W); c++) cols.push(c);
  return cols;
}

function hitsBuilding(s: GameState): boolean {
  return planeColumns(s).some((c) => (s.city.heights[c] ?? 0) >= GROUND_ROW - s.plane.row);
}

function crash(s: GameState): GameState {
  return {
    ...s,
    phase: 'crashed',
    timerMs: 0,
    bomb: null,
    explosions: [...s.explosions, { x: s.plane.x, y: s.plane.row * CELL_H, ageMs: 0 }],
  };
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
  const single = s.mode === 'single' && s.singleCity !== null;
  const { city, rngState } = single ? { city: s.singleCity!, rngState: s.rngState } : newCity(s, 1);
  return {
    ...s,
    rngState,
    city,
    clearedRow: null,
    phase: 'playing',
    timerMs: 0,
    level: single ? s.level : 1,
    score: 0,
    newBest: false,
    plane: { x: -s.planeWidth, row: PLANE_START_ROW },
    bomb: null,
    explosions: [],
  };
}

/** Rows of slack the clearability check gives a human over the bot. */
const BOT_SLACK_ROWS = 2;

function newCity(s: GameState, level: number): { city: City; rngState: number } {
  return generateCity(level, {
    rngState: s.rngState,
    buildingTypes: s.buildingTypes,
    // Must pass from the real start row and with BOT_SLACK_ROWS fewer passes, so there is room for mistakes.
    isClearable: (city) =>
      botClears(s, level, city, PLANE_START_ROW + BOT_SLACK_ROWS) && botClears(s, level, city, PLANE_START_ROW),
  });
}

/**
 * Can a simple bot clear `city` on `level` with the plane starting on `startRow`?
 * The bot drops a bomb whenever one is free and the plane is over a building. Runs the real rules.
 */
function botClears(base: GameState, level: number, city: City, startRow: number): boolean {
  let s: GameState = {
    ...base,
    phase: 'playing',
    level,
    city,
    bomb: null,
    explosions: [],
    plane: { x: -base.planeWidth, row: startRow },
  };
  const dt = 1000 / 60;
  for (let t = 0; t < 600_000 && s.phase === 'playing'; t += dt) {
    const col = Math.floor((s.plane.x + s.planeWidth / 2) / CELL_W);
    s = tickFlying(s, { pressed: !s.bomb && (s.city.heights[col] ?? 0) > 0 }, dt);
  }
  return s.phase === 'clearing';
}

function emptyCity(): City {
  return { heights: Array<number>(COLS).fill(0), types: Array<number>(COLS).fill(0) };
}
