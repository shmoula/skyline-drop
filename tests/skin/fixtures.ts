import type { ImageLike, SkinManifest } from '../../src/skin/types';

export const MANIFEST: SkinManifest = {
  name: 'Test',
  buildingTypes: 3,
  font: { charWidth: 8, charHeight: 8 },
  planeFrames: 1,
  explosionFrames: 4,
  colours: { background: '#ffffff' },
};

const img = (width: number, height: number): ImageLike => ({ width, height });

/** Correctly sized images for MANIFEST, keyed by file name. */
export function goodImages(): Record<string, ImageLike> {
  const images: Record<string, ImageLike> = {
    'plane.png': img(24, 8),
    'bomb.png': img(4, 6),
    'explosion.png': img(64, 16),
    'ground.png': img(16, 8),
    'font.png': img(128, 32),
  };
  for (let n = 1; n <= 3; n++) {
    images[`building-${n}-floor.png`] = img(16, 8);
    images[`building-${n}-roof.png`] = img(16, 8);
  }
  return images;
}
