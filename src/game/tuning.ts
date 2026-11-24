/** Every gameplay number that is meant to be tuned by play-testing. */
export interface Tuning {
  planeSpeedPxPerS: number;
  planeSpeedGrowth: number;
  planeSpeedMaxPxPerS: number;
  bombFallPxPerS: number;
  floorsPerBomb: number;
  clearBonusPerLevel: number;
  landingDropMs: number;
  landingPauseMs: number;
  crashMs: number;
  gameOverLockMs: number;
  budgetMargin: number;
}

export const DEFAULT_TUNING: Tuning = {
  planeSpeedPxPerS: 60,
  planeSpeedGrowth: 1.05,
  planeSpeedMaxPxPerS: 100,
  bombFallPxPerS: 120,
  floorsPerBomb: 3,
  clearBonusPerLevel: 50,
  landingDropMs: 250,
  landingPauseMs: 1500,
  crashMs: 1000,
  gameOverLockMs: 500,
  budgetMargin: 0.7,
};

/** Plane speed for a level, in px/s. */
export function planeSpeed(level: number, t: Tuning): number {
  return Math.min(t.planeSpeedPxPerS * t.planeSpeedGrowth ** (level - 1), t.planeSpeedMaxPxPerS);
}
