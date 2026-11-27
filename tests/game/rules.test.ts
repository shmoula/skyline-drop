import { describe, expect, it } from 'vitest';
import { getRules } from '../../src/game/rules';

describe('frozen rule sets', () => {
  it('rules v1 pins today\'s numbers literally', () => {
    expect(getRules(1)).toEqual({
      tuning: { planeSpeedPxPerS: 60, planeSpeedGrowth: 1.05, planeSpeedMaxPxPerS: 100, bombFallPxPerS: 120,
        floorsPerBomb: 3, clearBonusPerLevel: 50, landingDropMs: 250, landingPauseMs: 1500, crashMs: 1000,
        gameOverLockMs: 500, budgetMargin: 0.7 },
      planeWidth: 24, bonusPerRow: 20, level: 1,
    });
  });
  it('rule sets are frozen', () => {
    expect(Object.isFrozen(getRules(1))).toBe(true);
    expect(Object.isFrozen(getRules(1)!.tuning)).toBe(true);
  });
  it('unknown versions are null', () => {
    expect(getRules(0)).toBeNull();
    expect(getRules(2)).toBeNull();
    expect(getRules(1.5)).toBeNull();
  });
});
