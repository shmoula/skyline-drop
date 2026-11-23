import { describe, expect, it } from 'vitest';
import { advanceClock } from '../../src/shell/clock';

describe('advanceClock', () => {
  it('runs whole fixed steps and carries the remainder', () => {
    const r = advanceClock(0, 40);
    expect(r.steps).toBe(2);
    expect(r.accMs).toBeCloseTo(6.667, 3);
  });

  it('adds the carried remainder to the next frame', () => {
    expect(advanceClock(10, 10).steps).toBe(1);
  });
});

describe('advanceClock after a long pause (Review Focus 3)', () => {
  it('clamps elapsed time to 250 ms', () => {
    expect(advanceClock(0, 600_000).steps).toBe(15);
  });

  it('ignores negative elapsed time', () => {
    expect(advanceClock(0, -50)).toEqual({ steps: 0, accMs: 0 });
  });
});
