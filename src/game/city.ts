import { COLS } from './grid';
import { nextRandom } from './rng';

export interface City {
  /** Floors per column (length COLS); 0 = empty. */
  heights: number[];
  /** Building type per column, 1..buildingTypes (0 for empty columns). */
  types: number[];
}

export interface CityOptions {
  rngState: number;
  buildingTypes: number;
  /** Can a player clear this city on this level? Decides how much of the drawn city is kept. */
  isClearable: (city: City) => boolean;
}

/**
 * A random city for `level` that `isClearable` accepts. Pure: returns the advanced rng state.
 *
 * Draw a skyline from the level's growth table, then — if it's too much — remove whole
 * buildings in a random order (fewest removals that pass) so the skyline stays tall and
 * varied. Only if a single building is still too much is its height lowered.
 */
export function generateCity(level: number, opts: CityOptions): { city: City; rngState: number } {
  let rng = opts.rngState;
  const rand = (): number => {
    const [v, next] = nextRandom(rng);
    rng = next;
    return v;
  };
  const randInt = (lo: number, hi: number): number => lo + Math.floor(rand() * (hi - lo + 1));
  const shuffle = (list: number[], count = list.length): number[] => {
    const a = list.slice();
    for (let i = 0; i < count; i++) {
      const j = randInt(i, a.length - 1);
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  };

  const occupied = Math.min(8 + 2 * (level - 1), 18);
  // 14 floors is the tallest a single building can be and still be cleared one bomb per pass with slack.
  const maxH = Math.min(4 + level, 14);
  const minH = Math.min(1 + Math.floor((level - 1) / 2), maxH);

  const cols = shuffle(Array.from({ length: COLS }, (_, i) => i), occupied).slice(0, occupied);
  const heights = Array<number>(COLS).fill(0);
  const types = Array<number>(COLS).fill(0);
  for (const c of cols) {
    heights[c] = randInt(minH, maxH);
    types[c] = randInt(1, opts.buildingTypes);
  }
  const removalOrder = shuffle(cols);

  const without = (k: number): City => {
    const h = heights.slice();
    const t = types.slice();
    for (const c of removalOrder.slice(0, k)) {
      h[c] = 0;
      t[c] = 0;
    }
    return { heights: h, types: t };
  };

  // Fewest removals that pass: binary search (removing buildings only makes it easier),
  // then step forward in case the predicate isn't perfectly monotone.
  let lo = 0;
  let hi = occupied - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (opts.isClearable(without(mid))) hi = mid;
    else lo = mid + 1;
  }
  for (let k = lo; k < occupied; k++) {
    const city = without(k);
    if (opts.isClearable(city)) return { city, rngState: rng };
  }

  // Even one building is too much: lower the last one until it passes (1 floor always does).
  const last = without(occupied - 1);
  const c = last.heights.findIndex((h) => h > 0);
  while (last.heights[c]! > 1 && !opts.isClearable(last)) last.heights[c]! -= 1;
  return { city: last, rngState: rng };
}
