import { describe, expect, it } from 'vitest';
import { step } from '../../src/game/game';
import { cityWith, run, runUntil, startedGame } from './helpers';

/** Plane x that puts a 16 px plane's centre over `col`. */
const over = (col: number) => col * 16;

describe('bombs', () => {
  it('removes three floors and scores them', () => {
    let s = startedGame({ city: cityWith({ 5: 6, 19: 1 }), plane: { x: over(5), row: 2 } });
    s = step(s, { pressed: true }, 0);
    expect(s.bomb).not.toBeNull();
    s = runUntil(s, (g) => g.bomb === null);
    expect(s.city.heights[5]).toBe(3);
    expect(s.score).toBe(3);
    expect(s.explosions).toHaveLength(1);
  });
});

describe('bomb scoring', () => {
  it('removes a short building entirely and scores only what was there', () => {
    let s = startedGame({ city: cityWith({ 5: 2, 19: 1 }), plane: { x: over(5), row: 2 } });
    s = runUntil(step(s, { pressed: true }, 0), (g) => g.bomb === null);
    expect(s.city.heights[5]).toBe(0);
    expect(s.score).toBe(2);
  });

  it('multiplies floors by the level number', () => {
    let s = startedGame({ city: cityWith({ 5: 6, 19: 1 }), plane: { x: over(5), row: 2 }, level: 3 });
    s = runUntil(step(s, { pressed: true }, 0), (g) => g.bomb === null);
    expect(s.score).toBe(9);
  });
});

describe('one bomb at a time', () => {
  it('drops extra presses instead of queueing them', () => {
    let s = startedGame({ city: cityWith({ 5: 6, 8: 6, 19: 1 }), plane: { x: over(5), row: 2 } });
    s = step(s, { pressed: true }, 0);
    // Move the plane over column 8 and press again while the first bomb is still falling.
    s = step({ ...s, plane: { x: over(8), row: 2 } }, { pressed: true }, 16);
    expect(s.bomb?.col).toBe(5);
    s = runUntil(s, (g) => g.bomb === null);
    s = run(s, 2000);
    expect(s.bomb).toBeNull();
    expect(s.city.heights[5]).toBe(3);
    expect(s.city.heights[8]).toBe(6);
  });

  it('lets a bomb over empty ground just disappear', () => {
    let s = startedGame({ city: cityWith({ 19: 1 }), plane: { x: over(5), row: 2 } });
    s = step(s, { pressed: true }, 0);
    expect(s.bomb).not.toBeNull();
    s = runUntil(s, (g) => g.bomb === null);
    expect(s.score).toBe(0);
    expect(s.explosions).toHaveLength(0);
  });
});

describe('plane partly off-screen (Review Focus 4)', () => {
  it('ignores a press while the plane centre is left of the screen', () => {
    const s = step(startedGame({ plane: { x: -16, row: 2 } }), { pressed: true }, 0);
    expect(s.bomb).toBeNull();
  });

  it('ignores a press while the plane centre is right of the screen', () => {
    const s = step(startedGame({ plane: { x: 315, row: 2 } }), { pressed: true }, 0);
    expect(s.bomb).toBeNull();
  });
});
