import { describe, expect, it } from 'vitest';
import { fitViewport } from '../../src/shell/viewport';

describe('fitViewport', () => {
  it('uses an exact integer scale when it fills the window', () => {
    expect(fitViewport(1280, 800)).toEqual({ scale: 4, x: 0, y: 0, width: 1280, height: 800 });
  });

  it('uses the largest integer scale and letterboxes the rest', () => {
    expect(fitViewport(1000, 800)).toEqual({ scale: 3, x: 20, y: 100, width: 960, height: 600 });
  });
});

describe('fitViewport on small and portrait screens (Review Focus 2)', () => {
  it('fills the width of a portrait phone with a fractional scale', () => {
    const v = fitViewport(375, 812);
    expect(v.scale).toBeCloseTo(1.171875, 6);
    expect(v.width).toBeCloseTo(375, 6);
    expect(v.height).toBeCloseTo(234.375, 6);
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.y).toBeCloseTo(288.8125, 6);
  });

  it('shrinks below 1x in a tiny window', () => {
    expect(fitViewport(200, 100).scale).toBeCloseTo(0.5, 6);
  });

  it('never returns zero or NaN for an empty window', () => {
    const v = fitViewport(0, 0);
    expect(v.scale).toBeGreaterThan(0);
    for (const n of Object.values(v)) expect(Number.isNaN(n)).toBe(false);
  });
});
