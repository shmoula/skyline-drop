import { describe, expect, it } from 'vitest';
import { floorBudget, generateCity } from '../../src/game/city';
import { DEFAULT_TUNING } from '../../src/game/tuning';

describe('floor budget', () => {
  it('matches the worked example', () => {
    // passes 24-10-2 = 12; passMs (320+16)/60 = 5600; fallMs 21*8/120 = 1400; 4 bombs/pass; x3 floors
    expect(floorBudget(10, 1, 16, DEFAULT_TUNING)).toBe(144);
  });
});

const opts = (seed: number) => ({ rngState: seed, buildingTypes: 3, planeWidth: 16, tuning: DEFAULT_TUNING });
const total = (h: number[]) => h.reduce((a, b) => a + b, 0);

describe('generated cities', () => {
  it('are clearable on every level 1–20', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (let level = 1; level <= 20; level++) {
        const { city } = generateCity(level, opts(seed));
        const maxH = Math.max(...city.heights);
        const occupied = city.heights.filter((h) => h > 0).length;
        expect(city.heights).toHaveLength(20);
        expect(total(city.heights)).toBeGreaterThan(0);
        expect(total(city.heights)).toBeLessThanOrEqual(0.7 * floorBudget(maxH, level, 16, DEFAULT_TUNING));
        expect(city.heights.every((h) => h >= 0 && h <= 16)).toBe(true);
        expect(occupied).toBeLessThanOrEqual(Math.min(8 + 2 * (level - 1), 18));
        city.heights.forEach((h, c) => {
          if (h > 0) expect([1, 2, 3]).toContain(city.types[c]);
          else expect(city.types[c]).toBe(0);
        });
      }
    }
  });

  it('are the same for the same seed', () => {
    expect(generateCity(4, opts(7))).toEqual(generateCity(4, opts(7)));
    expect(generateCity(4, opts(7)).city).not.toEqual(generateCity(4, opts(8)).city);
  });

  it('get taller and denser on later levels', () => {
    let l1 = 0;
    let l6 = 0;
    for (let seed = 1; seed <= 20; seed++) {
      l1 += total(generateCity(1, opts(seed)).city.heights);
      l6 += total(generateCity(6, opts(seed)).city.heights);
    }
    expect(l6).toBeGreaterThan(l1);
  });
});
