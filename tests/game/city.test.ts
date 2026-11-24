import { describe, expect, it } from 'vitest';
import { generateCity, type City } from '../../src/game/city';

const total = (c: City) => c.heights.reduce((a, b) => a + b, 0);
const anything = () => true;
const opts = (seed: number, isClearable: (c: City) => boolean = anything) => ({ rngState: seed, buildingTypes: 3, isClearable });

describe('generated cities', () => {
  it('follow the level growth table when nothing needs removing', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (let level = 1; level <= 20; level++) {
        const { city } = generateCity(level, opts(seed));
        const occupied = city.heights.filter((h) => h > 0);
        expect(city.heights).toHaveLength(20);
        expect(occupied).toHaveLength(Math.min(8 + 2 * (level - 1), 18));
        const lo = Math.min(1 + Math.floor((level - 1) / 2), 14);
        const hi = Math.min(4 + level, 14);
        for (const h of occupied) {
          expect(h).toBeGreaterThanOrEqual(lo);
          expect(h).toBeLessThanOrEqual(hi);
        }
        city.heights.forEach((h, c) => {
          if (h > 0) expect([1, 2, 3]).toContain(city.types[c]);
          else expect(city.types[c]).toBe(0);
        });
      }
    }
  });

  it('remove whole buildings, keeping the rest at full height, until the check passes', () => {
    const full = generateCity(12, opts(5)).city;
    const { city } = generateCity(12, opts(5, (c) => total(c) <= 60));
    expect(total(city)).toBeLessThanOrEqual(60);
    expect(total(city)).toBeGreaterThan(30); // fewest removals, not everything
    city.heights.forEach((h, c) => {
      if (h > 0) expect(h).toBe(full.heights[c]);
    });
  });

  it('lower a single building only when even one is too much', () => {
    const { city } = generateCity(12, opts(5, (c) => total(c) <= 2));
    expect(city.heights.filter((h) => h > 0)).toEqual([2]);
  });

  it('are the same for the same seed', () => {
    expect(generateCity(4, opts(7))).toEqual(generateCity(4, opts(7)));
    expect(generateCity(4, opts(7)).city).not.toEqual(generateCity(4, opts(8)).city);
  });
});
