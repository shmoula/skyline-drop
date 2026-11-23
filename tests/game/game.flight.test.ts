import { describe, expect, it } from 'vitest';
import { newGame, step } from '../../src/game/game';
import { OPTS, run, startedGame } from './helpers';

describe('starting a run', () => {
  it('title waits for the button', () => {
    const title = newGame(OPTS);
    expect(title.phase).toBe('title');
    expect(step(title, { pressed: false }, 16).phase).toBe('title');

    const s = step(title, { pressed: true }, 16);
    expect(s.phase).toBe('playing');
    expect(s.level).toBe(1);
    expect(s.score).toBe(0);
    expect(s.plane).toEqual({ x: -16, row: 2 });
  });
});

describe('plane flight', () => {
  it('flies right at 60 px/s on level 1', () => {
    const s = run(startedGame(), 1000);
    expect(s.plane.x).toBeCloseTo(-16 + 60, 3);
    expect(s.plane.row).toBe(2);
  });
});

describe('plane wrap', () => {
  it('wraps to the left edge one row lower', () => {
    const s = step(startedGame({ plane: { x: 319.5, row: 2 } }), { pressed: false }, 100);
    expect(s.plane.row).toBe(3);
    expect(s.plane.x).toBeGreaterThanOrEqual(-16);
    expect(s.plane.x).toBeLessThanOrEqual(-16 + 6);
  });
});
