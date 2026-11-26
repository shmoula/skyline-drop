import { describe, expect, it } from 'vitest';
import {
  canPlay, canShare, clearAll, newEditor, paint, recordClear, setName, setStyle, toShared,
} from '../../src/editor/editor';

describe('editor state', () => {
  it('paint sets column top to touched row', () => {
    const e = paint(newEditor(), 4, 20);
    expect(e.city.heights[4]).toBe(4);
    expect(e.city.types[4]).toBe(1);
  });

  it('paint clamps to 14 floors and ground empties', () => {
    let e = paint(newEditor(), 4, 2);
    expect(e.city.heights[4]).toBe(14);
    e = paint(e, 4, 24);
    expect(e.city.heights[4]).toBe(0);
    expect(e.city.types[4]).toBe(0);
  });

  it('ignores columns outside the grid', () => {
    const e = newEditor();
    expect(paint(e, -1, 20)).toBe(e);
    expect(paint(e, 20, 20)).toBe(e);
  });

  it('real edits re-lock sharing; no-op repaint does not', () => {
    const e = recordClear(paint(newEditor(), 4, 20), 300);
    expect(paint(e, 4, 20)).toBe(e);
    expect(canShare(paint(e, 5, 20))).toBe(false);
    expect(canShare(setStyle(e, 2))).toBe(true);
  });

  it('recordClear keeps the best', () => {
    expect(recordClear(recordClear(paint(newEditor(), 1, 20), 300), 200).clearedScore).toBe(300);
  });

  it('setName folds', () => expect(setName(newEditor(), 'Vašek').name).toBe('VASEK'));

  it('empty city cannot be played', () => expect(canPlay(newEditor())).toBe(false));

  it('painted city can be played', () => expect(canPlay(paint(newEditor(), 0, 20))).toBe(true));

  it('clearAll resets the city and clearedScore', () => {
    const e = clearAll(recordClear(paint(newEditor(), 4, 20), 300));
    expect(canPlay(e)).toBe(false);
    expect(e.clearedScore).toBeNull();
  });

  it('toShared throws until cleared, then carries score and rules', () => {
    const e = setName(paint(newEditor(), 4, 20), 'abc');
    expect(() => toShared(e, 1)).toThrow();
    const s = toShared(recordClear(e, 300), 1);
    expect(s.rules).toBe(1);
    expect(s.score).toBe(300);
    expect(s.name).toBe('ABC');
    expect(s.city.heights[4]).toBe(4);
  });
});
