import { describe, expect, it } from 'vitest';
import { checkSkinPixels } from '../../scripts/skin-pixels';

/** A width×1 RGBA image from [r,g,b,a] pixels. */
const png = (...pixels: [number, number, number, number][]) => ({
  width: pixels.length,
  height: 1,
  data: Uint8Array.from(pixels.flat()),
});
const PALETTE = ['#000000', '#FFFFFF'];

describe('checkSkinPixels', () => {
  it('accepts palette colours and fully transparent pixels', () => {
    expect(checkSkinPixels(png([0, 0, 0, 255], [255, 255, 255, 255], [9, 9, 9, 0]), 'ok.png', PALETTE)).toEqual([]);
  });

  it('flags half-transparent (anti-aliased) pixels', () => {
    const errors = checkSkinPixels(png([0, 0, 0, 255], [0, 0, 0, 128]), 'soft.png', PALETTE);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('soft.png');
    expect(errors[0]).toContain('alpha');
  });

  it('flags opaque colours outside the palette', () => {
    const errors = checkSkinPixels(png([0x12, 0x34, 0x56, 255]), 'odd.png', PALETTE);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('odd.png');
    expect(errors[0]).toContain('#123456');
  });

  it('reports each bad colour once, not once per pixel', () => {
    const bad: [number, number, number, number] = [0x12, 0x34, 0x56, 255];
    expect(checkSkinPixels(png(bad, bad, bad), 'odd.png', PALETTE)).toHaveLength(1);
  });
});
