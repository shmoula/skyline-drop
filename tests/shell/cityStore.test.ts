import { describe, expect, it } from 'vitest';
import { newEditor, paint, recordClear, setName } from '../../src/editor/editor';
import { loadDraft, readCityBest, saveDraft, writeCityBest } from '../../src/shell/cityStore';

const memory = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
};
const throwing = {
  getItem: (): string | null => { throw new Error('SecurityError'); },
  setItem: (): void => { throw new Error('QuotaExceeded'); },
};

describe('draft storage', () => {
  it('round-trips a draft', () => {
    const s = memory();
    const e = recordClear(setName(paint(newEditor(), 4, 20), 'abc'), 300);
    saveDraft(s, e);
    expect(loadDraft(s)).toEqual(e);
  });

  it('round-trips an uncleared draft', () => {
    const s = memory();
    const e = paint(newEditor(), 4, 20);
    saveDraft(s, e);
    expect(loadDraft(s)).toEqual(e);
  });

  it('returns null for missing or garbage data', () => {
    expect(loadDraft(null)).toBeNull();
    expect(loadDraft(memory())).toBeNull();
    const s = memory();
    s.setItem('skylinedrop.draft', 'not json');
    expect(loadDraft(s)).toBeNull();
    s.setItem('skylinedrop.draft', JSON.stringify({ code: 'zzz', cleared: null }));
    expect(loadDraft(s)).toBeNull();
  });

  it('treats an invalid cleared value as null', () => {
    const s = memory();
    saveDraft(s, recordClear(paint(newEditor(), 4, 20), 300));
    const raw = JSON.parse(s.getItem('skylinedrop.draft') as string);
    s.setItem('skylinedrop.draft', JSON.stringify({ ...raw, cleared: -3 }));
    expect(loadDraft(s)?.clearedScore).toBeNull();
  });

  it('swallows storage errors', () => {
    expect(() => saveDraft(throwing, newEditor())).not.toThrow();
    expect(() => saveDraft(null, newEditor())).not.toThrow();
    expect(loadDraft(throwing)).toBeNull();
  });
});

describe('per-city best', () => {
  it('round-trips and defaults to 0', () => {
    const s = memory();
    expect(readCityBest(s, 'k')).toBe(0);
    writeCityBest(s, 'k', 42);
    expect(readCityBest(s, 'k')).toBe(42);
    expect(readCityBest(s, 'other')).toBe(0);
  });

  it('swallows storage errors', () => {
    expect(readCityBest(throwing, 'k')).toBe(0);
    expect(readCityBest(null, 'k')).toBe(0);
    expect(() => writeCityBest(throwing, 'k', 1)).not.toThrow();
    expect(() => writeCityBest(null, 'k', 1)).not.toThrow();
  });
});
