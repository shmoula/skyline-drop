import { describe, expect, it } from 'vitest';
import { readBest, writeBest } from '../../src/shell/bestScore';

const holding = (value: string | null) => ({ getItem: () => value });

describe('best score storage (Review Focus 5)', () => {
  it('reads a stored best', () => {
    expect(readBest(holding('42'))).toBe(42);
  });

  it('falls back to 0 for missing, garbage or negative values', () => {
    expect(readBest(null)).toBe(0);
    expect(readBest(holding(null))).toBe(0);
    expect(readBest(holding('abc'))).toBe(0);
    expect(readBest(holding('-5'))).toBe(0);
  });

  it('falls back to 0 when storage throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(readBest(throwing)).toBe(0);
  });

  it('swallows write failures', () => {
    const full = {
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    };
    expect(() => writeBest(full, 7)).not.toThrow();
    expect(() => writeBest(null, 7)).not.toThrow();
  });

  it('round-trips a written best', () => {
    const store = new Map<string, string>();
    const fake = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    writeBest(fake, 7);
    expect(readBest(fake)).toBe(7);
  });
});
