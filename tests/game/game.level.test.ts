import { describe, expect, it } from 'vitest';
import { newGame, step, type GameState } from '../../src/game/game';
import { cityWith, OPTS, run, runUntil, startedGame } from './helpers';

describe('clearing a level', () => {
  it('pays the level bonus when the last floor goes', () => {
    let s = startedGame({ city: cityWith({ 5: 3 }), plane: { x: 5 * 16, row: 2 }, level: 2 });
    s = runUntil(step(s, { pressed: true }, 0), (g) => g.bomb === null);
    expect(s.score).toBe(3 * 2 + 100);
    expect(s.phase).toBe('clearing');
  });
});

describe('landing', () => {
  it('descends, lands, then starts the next level', () => {
    let s = startedGame({ city: cityWith({ 5: 3 }), plane: { x: 5 * 16, row: 2 }, level: 2 });
    s = runUntil(step(s, { pressed: true }, 0), (g) => g.phase === 'clearing');
    expect(s.plane.row).toBe(2);

    s = run(s, 21 * 250 + 20);
    expect(s.phase).toBe('landed');
    expect(s.score).toBe(3 * 2 + 100);
    expect(s.plane.row).toBe(23);

    s = run(s, 1500 + 20);
    expect(s.phase).toBe('playing');
    expect(s.level).toBe(3);
    // Wraps can add rows, so landing may come early; the plane has only just set off again.
    expect(s.plane.row).toBe(2);
    expect(s.plane.x).toBeLessThan(32);
    expect(s.city.heights.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it('ignores the button while clearing and landed', () => {
    let s = startedGame({ city: cityWith({ 5: 3 }), plane: { x: 5 * 16, row: 2 } });
    s = runUntil(step(s, { pressed: true }, 0), (g) => g.phase === 'clearing');
    s = step({ ...s, plane: { x: 5 * 16, row: s.plane.row } }, { pressed: true }, 16);
    expect(s.bomb).toBeNull();
    s = runUntil(s, (g) => g.phase === 'landed');
    s = step(s, { pressed: true }, 16);
    expect(s.phase).toBe('landed');
    expect(s.bomb).toBeNull();
  });
});

describe('next level speed', () => {
  it('flies about 5% faster on level 2', () => {
    const s = startedGame({ level: 2, plane: { x: -16, row: 2 } });
    expect(run(s, 1000).plane.x - s.plane.x).toBeCloseTo(63, 1);
  });
});

/** A simple player: drop a bomb whenever one is free and the plane is over a building. */
export function botPlay(s: GameState, maxMs = 120_000): GameState {
  for (let t = 0; t < maxMs && s.phase === 'playing'; t += 1000 / 60) {
    const col = Math.floor((s.plane.x + s.planeWidth / 2) / 16);
    const press = !s.bomb && (s.city.heights[col] ?? 0) > 0;
    s = step(s, { pressed: press }, 1000 / 60);
  }
  return s;
}

/** The generated city for `level` with `seed`, as a just-started playing state. */
function levelState(level: number, seed: number): GameState {
  let s = step(newGame({ ...OPTS, seed }), { pressed: true }, 0);
  // Jump straight to `level` through the real level-up path: clear the city, land.
  while (s.level < level) {
    s = { ...s, city: cityWith({}) , bomb: null };
    s = step(s, { pressed: false }, 16); // -> clearing
    s = runUntil(s, (g) => g.phase === 'playing', 20_000);
  }
  return s;
}

const floors = (s: GameState) => s.city.heights.reduce((a, b) => a + b, 0);

describe('generated levels (review finding: flat late levels)', () => {
  it('are cleared by a simple bot on every level 1–20', () => {
    for (let seed = 1; seed <= 3; seed++) {
      let s = levelState(1, seed);
      for (let level = 1; level <= 20; level++) {
        expect(s.level).toBe(level);
        s = botPlay(s);
        expect(s.phase, `seed ${seed} level ${level}`).toBe('clearing');
        s = runUntil(s, (g) => g.phase === 'playing', 20_000);
      }
    }
  }, 60_000);

  it('keep getting taller and denser after level 5', () => {
    let l5 = 0;
    let l15 = 0;
    let max5 = 0;
    let max15 = 0;
    for (let seed = 1; seed <= 3; seed++) {
      const a = levelState(5, seed);
      const b = levelState(15, seed);
      l5 += floors(a);
      l15 += floors(b);
      max5 += Math.max(...a.city.heights);
      max15 += Math.max(...b.city.heights);
    }
    expect(l15).toBeGreaterThan(l5);
    expect(max15).toBeGreaterThan(max5);
  }, 60_000);
});
