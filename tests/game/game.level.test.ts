import { describe, expect, it } from 'vitest';
import { step } from '../../src/game/game';
import { cityWith, run, runUntil, startedGame } from './helpers';

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
