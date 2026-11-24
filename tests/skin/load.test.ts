import { describe, expect, it } from 'vitest';
import { loadSkin } from '../../src/skin/load';
import { goodImages, MANIFEST } from './fixtures';

type FakeImage = { width: number; height: number; url: string };

/** Fake loaders over the fixture files; `fail` lists files whose load rejects. */
function fakes(fail: string[] = []) {
  const images = goodImages();
  const loadImage = async (url: string): Promise<FakeImage> => {
    const file = url.split('/').pop()!;
    const img = images[file];
    if (!img || fail.includes(file)) throw new Error(`404 ${url}`);
    return { ...img, url };
  };
  const fetchJson = async (url: string): Promise<unknown> => {
    if (!url.endsWith('/skin.json')) throw new Error(`404 ${url}`);
    return MANIFEST;
  };
  return { loadImage, fetchJson };
}

describe('loadSkin', () => {
  it('assembles images in building-type order', async () => {
    const { loadImage, fetchJson } = fakes();
    const skin = await loadSkin('./skins/test/', loadImage, fetchJson);
    expect(skin.manifest.name).toBe('Test');
    expect(skin.buildings).toHaveLength(3);
    expect(skin.buildings[2]!.roof.url).toBe('./skins/test/building-3-roof.png');
    expect(skin.plane.url).toBe('./skins/test/plane.png');
    expect(skin.explosion?.url).toBe('./skins/test/explosion.png');
  });

  it('treats a missing optional background as none', async () => {
    const { loadImage, fetchJson } = fakes();
    const skin = await loadSkin('./skins/test/', loadImage, fetchJson);
    expect(skin.background).toBeNull();
  });

  it('rejects naming a required file that will not load', async () => {
    const { loadImage, fetchJson } = fakes(['bomb.png']);
    await expect(loadSkin('./skins/test/', loadImage, fetchJson)).rejects.toThrow(/bomb\.png/);
  });

  it('rejects naming skin.json when the manifest will not load', async () => {
    const { loadImage } = fakes();
    const fetchJson = async () => {
      throw new Error('404');
    };
    await expect(loadSkin('./skins/missing/', loadImage, fetchJson)).rejects.toThrow(/skin\.json/);
  });

  it('rejects with the validation messages for a mis-sized image', async () => {
    const { fetchJson } = fakes();
    const loadImage = async (url: string) => ({ width: 99, height: 99, url });
    await expect(loadSkin('./skins/test/', loadImage, fetchJson)).rejects.toThrow(/plane\.png/);
  });
});
