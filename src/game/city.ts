import { CELL_H, COLS, GROUND_ROW, PLANE_START_ROW, SCREEN_W } from './grid';
import { nextRandom } from './rng';
import { planeSpeed, type Tuning } from './tuning';

export interface City {
  /** Floors per column (length COLS); 0 = empty. */
  heights: number[];
  /** Building type per column, 1..buildingTypes (0 for empty columns). */
  types: number[];
}

/**
 * How many floors a perfect player can destroy before the plane reaches the tallest roof.
 * Conservative: one bomb in flight, each falling the full height from the start row.
 */
export function floorBudget(maxHeight: number, level: number, planeWidth: number, tuning: Tuning): number {
  const passes = Math.max(0, GROUND_ROW - maxHeight - PLANE_START_ROW);
  const passMs = ((SCREEN_W + planeWidth) / planeSpeed(level, tuning)) * 1000;
  const fallMs = (((GROUND_ROW - PLANE_START_ROW - 1) * CELL_H) / tuning.bombFallPxPerS) * 1000;
  const bombsPerPass = Math.floor(passMs / fallMs);
  return passes * bombsPerPass * tuning.floorsPerBomb;
}

export interface CityOptions {
  rngState: number;
  buildingTypes: number;
  planeWidth: number;
  tuning: Tuning;
}

/** A random city for `level` that a perfect player can always clear. Pure: returns the advanced rng state. */
export function generateCity(level: number, opts: CityOptions): { city: City; rngState: number } {
  let rng = opts.rngState;
  const rand = (): number => {
    const [v, next] = nextRandom(rng);
    rng = next;
    return v;
  };
  const randInt = (lo: number, hi: number): number => lo + Math.floor(rand() * (hi - lo + 1));

  const occupied = Math.min(8 + 2 * (level - 1), 18);
  const maxH = Math.min(4 + level, 16);
  const minH = Math.min(1 + Math.floor((level - 1) / 2), maxH);

  // Pick `occupied` distinct columns (partial Fisher–Yates).
  const cols = Array.from({ length: COLS }, (_, i) => i);
  for (let i = 0; i < occupied; i++) {
    const j = randInt(i, COLS - 1);
    [cols[i], cols[j]] = [cols[j]!, cols[i]!];
  }

  const heights = Array<number>(COLS).fill(0);
  const types = Array<number>(COLS).fill(0);
  for (const c of cols.slice(0, occupied)) {
    heights[c] = randInt(minH, maxH);
    types[c] = randInt(1, opts.buildingTypes);
  }

  // Enforce the budget: shave the tallest building (lowest column on ties) until clearable.
  const total = (): number => heights.reduce((a, b) => a + b, 0);
  const tallest = (): number => heights.indexOf(Math.max(...heights));
  while (total() > opts.tuning.budgetMargin * floorBudget(heights[tallest()]!, level, opts.planeWidth, opts.tuning)) {
    const c = tallest();
    heights[c]! -= 1;
    if (heights[c] === 0) types[c] = 0;
  }

  return { city: { heights, types }, rngState: rng };
}
