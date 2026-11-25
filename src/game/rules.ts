import type { Tuning } from './tuning';

/**
 * A frozen, versioned snapshot of every rule that affects play.
 * Shared cities carry a rules version so a city always plays under the rules it was made with.
 */
export interface RuleSet {
  readonly tuning: Readonly<Tuning>;
  readonly planeWidth: number;
  readonly bonusPerRow: number;
  readonly level: number;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

/**
 * Version 1 literals. Deliberately NOT derived from DEFAULT_TUNING: retuning the normal game
 * must never change what version 1 plays like.
 */
export const RULES: Readonly<Record<number, RuleSet>> = deepFreeze({
  1: {
    tuning: {
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
    },
    planeWidth: 24,
    bonusPerRow: 20,
    level: 1,
  },
});

/** The rules version new cities are created with. */
export const CURRENT_RULES = 1;

/** Returns the rule set for a version, or null if that version is unknown. */
export function getRules(version: number): RuleSet | null {
  return Object.prototype.hasOwnProperty.call(RULES, version) ? RULES[version]! : null;
}
