import { newGame, step, type City, type GameState, type NewGameOptions } from '../../src/game/game';
import { COLS } from '../../src/game/grid';

export const FRAME_MS = 1000 / 60;
export const OPTS: NewGameOptions = { best: 0, seed: 1, planeWidth: 16, buildingTypes: 3 };

/** City with the given column heights (type 1); everything else empty. */
export function cityWith(heights: Record<number, number>): City {
  const h = Array<number>(COLS).fill(0);
  for (const [col, v] of Object.entries(heights)) h[Number(col)] = v;
  return { heights: h, types: h.map((v) => (v > 0 ? 1 : 0)) };
}

/**
 * A run that has just started (phase 'playing'). By default the city is a single
 * 1-floor building in column 19 so the level isn't already "cleared" (ledger ruling).
 */
export function startedGame(
  over: Partial<Pick<GameState, 'city' | 'plane' | 'level' | 'score' | 'best'>> = {},
  opts: Partial<NewGameOptions> = {},
): GameState {
  const s = step(newGame({ ...OPTS, ...opts }), { pressed: true }, 0);
  return { ...s, city: cityWith({ 19: 1 }), ...over };
}

/** Advance `ms` of game time in 60 Hz frames. `pressed` applies to the first frame only. */
export function run(s: GameState, ms: number, pressed = false): GameState {
  const frames = Math.round(ms / FRAME_MS);
  for (let i = 0; i < frames; i++) s = step(s, { pressed: pressed && i === 0 }, FRAME_MS);
  return s;
}

/** Step frame by frame until `done(s)` or `maxMs` elapses. */
export function runUntil(s: GameState, done: (s: GameState) => boolean, maxMs = 60_000): GameState {
  for (let t = 0; t < maxMs && !done(s); t += FRAME_MS) s = step(s, { pressed: false }, FRAME_MS);
  return s;
}
