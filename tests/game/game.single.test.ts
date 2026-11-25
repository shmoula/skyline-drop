import { describe, expect, it } from 'vitest';
import { isClearable, newCityGame, step, type GameState } from '../../src/game/game';
import { getRules } from '../../src/game/rules';
import { cityWith, run, runUntil } from './helpers';

const R = getRules(1)!;

function cleared(best: number): GameState {
  let s = step(newCityGame({ city: cityWith({ 5: 3 }), rules: R, best, challenge: null }), { pressed: true }, 0);
  s = { ...s, plane: { x: 5 * 16, row: 2 } };
  return runUntil(step(s, { pressed: true }, 0), (g) => g.phase === 'clearing');
}

describe('single-city play', () => {
  it('starts on the title screen in single mode', () => {
    const s = newCityGame({ city: cityWith({ 5: 3 }), rules: R, best: 7, challenge: { name: 'A', score: 9 } });
    expect(s.phase).toBe('title');
    expect(s.mode).toBe('single');
    expect(s.best).toBe(7);
    expect(s.challenge).toEqual({ name: 'A', score: 9 });
    expect(s.tuning).toEqual(R.tuning);
    expect(s.bonusPerRow).toBe(20);
  });

  it('clear scores floors + clear bonus + height bonus', () => {
    const s = cleared(0);
    expect(s.clearedRow).toBe(2);
    expect(s.score).toBe(3 + 50 + 21 * 20);
  });

  it('ends after one level and replays the same city', () => {
    let s = runUntil(cleared(0), (g) => g.phase === 'gameOver');
    expect(s.phase).toBe('gameOver');
    expect(s.level).toBe(1);
    expect(s.best).toBe(473);
    expect(s.newBest).toBe(true);
    s = run(s, R.tuning.gameOverLockMs);
    s = step(s, { pressed: true }, 0);
    expect(s.phase).toBe('playing');
    expect(s.city).toEqual(cityWith({ 5: 3 }));
    expect(s.score).toBe(0);
    expect(s.clearedRow).toBeNull();
    expect(s.level).toBe(1);
  });

  it('a tie is not a new best', () => {
    const s = runUntil(cleared(473), (g) => g.phase === 'gameOver');
    expect(s.phase).toBe('gameOver');
    expect(s.newBest).toBe(false);
    expect(s.best).toBe(473);
  });

  it('a crash gets no height bonus and clearedRow stays null', () => {
    let s = step(newCityGame({ city: cityWith({ 0: 14 }), rules: R, best: 0, challenge: null }), { pressed: true }, 0);
    s = { ...s, plane: { x: -4, row: 2 } };
    s = runUntil(s, (g) => g.phase === 'gameOver');
    expect(s.phase).toBe('gameOver');
    expect(s.score).toBeLessThan(50);
    expect(s.clearedRow).toBeNull();
  });

  it('uses rule-set plane width, not skin', () => {
    expect(newCityGame({ city: cityWith({ 1: 1 }), rules: R, best: 0, challenge: null }).planeWidth).toBe(24);
  });

  it('isClearable: one low building yes, a full 14-floor wall no', () => {
    const wall = cityWith(Object.fromEntries([...Array(20).keys()].map((c) => [c, 14])));
    expect(isClearable(cityWith({ 10: 3 }), R)).toBe(true);
    // Under version-1 rules the bot (3 floors per bomb, fast bombs) can clear even a full wall, so the
    // "no" case uses a rule set where a bomb removes a single floor.
    const weak = { ...R, tuning: { ...R.tuning, floorsPerBomb: 1 } };
    expect(isClearable(wall, weak)).toBe(false);
  });
});
