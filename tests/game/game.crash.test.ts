import { describe, expect, it } from 'vitest';
import { step } from '../../src/game/game';
import { cityWith, run, runUntil, startedGame } from './helpers';

describe('crashing', () => {
  it('crashes when the plane flies into a building, then shows game over', () => {
    let s = startedGame({ city: cityWith({ 4: 22 }), plane: { x: 0, row: 2 } });
    s = runUntil(s, (g) => g.phase !== 'playing', 5000);
    expect(s.phase).toBe('crashed');
    expect(s.plane.x + 16).toBeGreaterThan(64);
    s = run(s, 1000 - 50);
    expect(s.phase).toBe('crashed');
    s = run(s, 50 + 20);
    expect(s.phase).toBe('gameOver');
  });
});

describe('near misses and wraps', () => {
  it('flies over a building whose roof is one row below the plane', () => {
    let s = startedGame({ city: cityWith({ 4: 21 }), plane: { x: -16, row: 2 } });
    s = runUntil(s, (g) => g.phase !== 'playing' || g.plane.row !== 2, 10_000);
    expect(s.phase).toBe('playing');
    expect(s.plane.row).toBe(3);
  });

  it('crashes after wrapping into a tall building in column 0', () => {
    let s = startedGame({ city: cityWith({ 0: 21 }), plane: { x: 300, row: 2 } });
    s = runUntil(s, (g) => g.phase !== 'playing', 3000);
    expect(s.phase).toBe('crashed');
    expect(s.plane.row).toBe(3);
  });
});

/** Crash on purpose with a given score and best, then wait until game over. */
function gameOverWith(score: number, best: number) {
  const s = startedGame({ city: cityWith({ 0: 22 }), plane: { x: 0, row: 2 }, score, best });
  return runUntil(step(s, { pressed: false }, 16), (g) => g.phase === 'gameOver', 3000);
}

describe('best score', () => {
  it('records a new best at game over', () => {
    const s = gameOverWith(25, 10);
    expect(s.best).toBe(25);
    expect(s.newBest).toBe(true);
  });

  it('keeps the old best when the score is lower', () => {
    const s = gameOverWith(25, 30);
    expect(s.best).toBe(30);
    expect(s.newBest).toBe(false);
  });
});

describe('game over screen (Review Focus 1)', () => {
  it('is not skipped by a button held through the crash', () => {
    // The building is in column 1 so the held button's bombs (column 0) can't knock it down first.
    let s = startedGame({ city: cityWith({ 1: 22 }), plane: { x: -16, row: 2 }, score: 25, best: 10 });
    for (let t = 0; t < 3000 && s.phase !== 'gameOver'; t += 16) s = step(s, { pressed: true }, 16);
    expect(s.phase).toBe('gameOver');
    while (s.timerMs + 16 < 500) s = step(s, { pressed: true }, 16);
    expect(s.timerMs).toBeLessThan(500);
    expect(s.phase).toBe('gameOver');

    s = step(s, { pressed: false }, 20); // lock elapses
    s = step(s, { pressed: true }, 16);
    expect(s.phase).toBe('playing');
    expect(s.score).toBe(0);
    expect(s.level).toBe(1);
    expect(s.best).toBe(25);
  });
});
