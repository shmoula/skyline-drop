import { describe, expect, it } from 'vitest';
import { validateSkin } from '../../src/skin/validate';
import { goodImages, MANIFEST } from './fixtures';

describe('validateSkin', () => {
  it('accepts a complete, correctly sized skin', () => {
    expect(validateSkin(MANIFEST, goodImages())).toEqual([]);
  });
});

describe('validateSkin problems name the file', () => {
  const withImage = (file: string, image: { width: number; height: number } | undefined) => ({
    ...goodImages(),
    [file]: image,
  });
  const only = (errors: string[]) => {
    expect(errors).toHaveLength(1);
    return errors[0]!;
  };

  it('reports a missing building roof', () => {
    expect(only(validateSkin(MANIFEST, withImage('building-2-roof.png', undefined)))).toMatch(/building-2-roof\.png.*missing/);
  });

  it('reports a plane that is not 8 px tall', () => {
    const e = only(validateSkin(MANIFEST, withImage('plane.png', { width: 16, height: 9 })));
    expect(e).toContain('plane.png');
    expect(e).toContain('8 px tall');
  });

  it('reports a plane frame wider than 32 px', () => {
    expect(only(validateSkin(MANIFEST, withImage('plane.png', { width: 40, height: 8 })))).toContain('plane.png');
  });

  it('reports a floor tile of the wrong size', () => {
    const e = only(validateSkin(MANIFEST, withImage('building-1-floor.png', { width: 16, height: 16 })));
    expect(e).toContain('building-1-floor.png');
    expect(e).toContain('16×8');
  });

  it('reports a font sheet of the wrong size', () => {
    expect(only(validateSkin(MANIFEST, withImage('font.png', { width: 128, height: 40 })))).toContain('font.png');
  });

  it('reports a bomb bigger than 16×8', () => {
    expect(only(validateSkin(MANIFEST, withImage('bomb.png', { width: 8, height: 12 })))).toContain('bomb.png');
  });

  it('reports an explosion strip that does not split into frames', () => {
    expect(only(validateSkin(MANIFEST, withImage('explosion.png', { width: 30, height: 16 })))).toContain('explosion.png');
  });

  it('reports a background that is not 320×200', () => {
    expect(only(validateSkin(MANIFEST, withImage('background.png', { width: 320, height: 240 })))).toContain('background.png');
  });

  it('reports a broken manifest against skin.json', () => {
    const { buildingTypes: _drop, ...rest } = MANIFEST;
    const errors = validateSkin(rest, goodImages());
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('skin.json');
    expect(validateSkin(null, goodImages())[0]).toContain('skin.json');
  });
});
