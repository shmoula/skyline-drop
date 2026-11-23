import { describe, expect, it } from 'vitest';
import { CELL_H, CELL_W, COLS, GROUND_ROW, PLANE_START_ROW, ROWS, SCREEN_H, SCREEN_W } from '../../src/game/grid';

describe('grid', () => {
  it('matches 320x200 split into 16x8 cells', () => {
    expect(SCREEN_W).toBe(320);
    expect(SCREEN_H).toBe(200);
    expect(COLS * CELL_W).toBe(320);
    expect(ROWS * CELL_H).toBe(200);
    expect(COLS).toBe(20);
    expect(ROWS).toBe(25);
    expect(GROUND_ROW).toBe(24);
    expect(PLANE_START_ROW).toBe(2);
  });
});
